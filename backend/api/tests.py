from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from exams.models import Exam, Question, Choice, Result
from organizations.models import Organization, Course, Enrollment


class APIRegressionTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()
        cls.owner = User.objects.create_user(email='owner@example.com', role='organization')
        cls.other = User.objects.create_user(email='other@example.com', role='organization')
        cls.student = User.objects.create_user(email='student@example.com')
        cls.organization = Organization.objects.create(owner=cls.owner, name='School')
        Organization.objects.create(owner=cls.other, name='Other school')
        cls.course = Course.objects.create(organization=cls.organization, name='Course')
        cls.exam = Exam.objects.create(author=cls.organization, title='Exam')
        question = Question.objects.create(exam=cls.exam, text='Question', number=1, point=5)
        Choice.objects.create(question=question, text='Yes', is_correct=True)
        Choice.objects.create(question=question, text='No', is_correct=False)

    def setUp(self):
        self.client.force_authenticate(self.student)

    def submit(self, answers=None, exam=None):
        return self.client.post('/api/v1/exam/submit', {
            'exam_id': (exam or self.exam).pk,
            'answers': answers if answers is not None else [{'question_number': 1, 'text': 'Yes'}],
        }, format='json')

    def test_course_owner_check(self):
        self.client.force_authenticate(self.other)
        response = self.client.patch(f'/api/v1/course/{self.course.pk}', {'name': 'Stolen'})
        self.assertEqual(response.status_code, 403)
        self.course.refresh_from_db()
        self.assertEqual(self.course.name, 'Course')
        self.client.force_authenticate(self.owner)
        response = self.client.patch(f'/api/v1/course/{self.course.pk}', {'name': 'Updated'})
        self.assertEqual(response.status_code, 200)

    def test_course_cache_invalidated_after_commit(self):
        self.client.force_authenticate(self.owner)
        with patch('api.signals.cache.delete') as delete:
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.patch(f'/api/v1/course/{self.course.pk}', {'name': 'Updated'})
            self.assertEqual(response.status_code, 200)
            delete.assert_any_call('courses:all')
            delete.assert_any_call(f'courses:org:{self.organization.pk}')

    def test_correct_answers_visible_only_to_author(self):
        url = f'/api/v1/exam/{self.exam.pk}'
        data = self.client.get(url).data
        self.assertNotIn('is_correct', data['questions'][0]['choices'][0])
        self.client.force_authenticate(self.owner)
        self.assertTrue(self.client.get(url).data['questions'][0]['choices'][0]['is_correct'])

    def test_duplicate_answer_rejected(self):
        response = self.submit([{'question_number': 1, 'text': 'Yes'}] * 3)
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Result.objects.exists())

    def test_malformed_and_unknown_answers_rejected(self):
        for answers in [[{}], [], [{'question_number': 99, 'text': 'Yes'}],
                        [{'question_number': 1, 'text': 'missing'}]]:
            with self.subTest(answers=answers):
                self.assertEqual(self.submit(answers).status_code, 400)

    def test_blank_answer_is_incorrect(self):
        response = self.submit([{'question_number': 1, 'text': ''}])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['percent'], 0)

    def test_empty_exam_returns_validation_error(self):
        empty = Exam.objects.create(author=self.organization, title='Legacy empty exam')
        self.assertEqual(self.submit(exam=empty).status_code, 400)

    def test_repeated_submission_keeps_one_best_result(self):
        for _ in range(2):
            response = self.submit()
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data['percent'], 100)
        self.assertEqual(Result.objects.count(), 1)
        self.assertEqual(Result.objects.get().score, 5)

    def exam_payload(self):
        return {'title': 'New', 'level': 2, 'questions': [
            {'text': 'New question', 'number': 1, 'point': 3,
             'choices': [{'text': 'Right', 'is_correct': True}, {'text': 'Wrong'}]},
        ]}

    def test_put_replaces_questions_and_patch_updates_metadata(self):
        self.client.force_authenticate(self.owner)
        url = f'/api/v1/exam/{self.exam.pk}'
        response = self.client.put(url, self.exam_payload(), format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(self.exam.questions.get().text, 'New question')
        self.assertEqual(self.exam.questions.get().choices.count(), 2)
        response = self.client.patch(url, {'description': 'Updated'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(self.exam.questions.count(), 1)

    def test_invalid_question_replacement_preserves_existing_questions(self):
        self.client.force_authenticate(self.owner)
        for questions in [[], [{'text': 'Missing required fields'}], self.exam_payload()['questions'] * 2]:
            response = self.client.patch(f'/api/v1/exam/{self.exam.pk}', {'questions': questions}, format='json')
            self.assertEqual(response.status_code, 400, response.data)
            self.assertEqual(self.exam.questions.get().text, 'Question')

    def test_other_owner_cannot_edit_exam(self):
        self.client.force_authenticate(self.other)
        response = self.client.put(f'/api/v1/exam/{self.exam.pk}', self.exam_payload(), format='json')
        self.assertEqual(response.status_code, 404)

    def test_duplicate_enrollment_is_idempotent(self):
        first = self.client.post('/api/v1/enrollments/', {'course': self.course.pk})
        second = self.client.post('/api/v1/enrollments/', {'course': self.course.pk})
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertEqual(first.data['id'], second.data['id'])
        self.assertEqual(Enrollment.objects.count(), 1)

    def test_second_organization_rejected_and_legacy_duplicates_readable(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post('/api/v1/organization/me', {'name': 'Second'})
        self.assertEqual(response.status_code, 400)
        Organization.objects.create(owner=self.owner, name='Legacy duplicate')
        self.assertEqual(self.client.get('/api/v1/organization/me').status_code, 200)

    def test_create_course_and_exam_without_organization(self):
        owner = get_user_model().objects.create_user(email='new@example.com', role='organization')
        self.client.force_authenticate(owner)
        self.assertEqual(self.client.post('/api/v1/course/create', {'name': 'Test'}).status_code, 400)
        response = self.client.post('/api/v1/exam/', self.exam_payload(), format='json')
        self.assertEqual(response.status_code, 400)

    def test_cannot_change_role_through_djoser_profile(self):
        response = self.client.patch('/api/v1/users/me/', {'role': 'organization'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.student.refresh_from_db()
        self.assertEqual(self.student.role, 'user')

    def test_task_trigger_requires_staff(self):
        with patch('api.views.update_events_task.delay') as delay:
            self.assertEqual(self.client.post('/api/v1/tasks/run-events/').status_code, 403)
            delay.assert_not_called()
