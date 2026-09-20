from events.tasks import update_events_task
from tatarlang.celery import app as celery_app
from tatarlang.cache import cache as redis_cache
from rest_framework import generics, permissions, views, viewsets, mixins
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework.exceptions import ValidationError
from .permissions import IsOrganizationOwner
from rest_framework.decorators import api_view, permission_classes
from django.shortcuts import get_object_or_404
from users.serializers import UserUpdateSerializer, UserSerializer
from organizations.models import Organization, Course, Enrollment
from organizations.serializers import OrganizationSerializer, CourseSerializer, EnrollmentSerializer
from events.models import Event
from events.serializers import EventSerializer
from exams.models import Exam, Result
from exams.serializers import ExamSerializer, ResultSerializer, ExamCreateSerializer, SubmitExamSerializer
from drf_yasg.utils import swagger_auto_schema

PERCENT_TO_PASS_EXAM = 60

User = get_user_model()


class UserProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'patch']

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return UserSerializer
        return UserUpdateSerializer


class OrganizationAPIView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]

    @swagger_auto_schema(response_body=OrganizationSerializer)
    def get(self, request, pk=None):
        organization = get_object_or_404(Organization, pk=pk)
        serializer = OrganizationSerializer(organization)
        return Response(serializer.data)


class OrganizationCreateRetrieveUpdateAPIView(mixins.CreateModelMixin,
                                              mixins.RetrieveModelMixin,
                                              mixins.UpdateModelMixin,
                                              generics.GenericAPIView):
    serializer_class = OrganizationSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizationOwner]

    def get_object(self):
        organization = self.request.user.organizations.first()
        if organization is None:
            from rest_framework.exceptions import NotFound
            raise NotFound('Организация не найдена.')
        self.check_object_permissions(self.request, organization)
        return organization

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class OrganizationListAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cache_key = 'organizations:list'
        cached = redis_cache.get(cache_key)
        if cached is not None:
            return Response(cached)
        organizations = Organization.objects.all()
        serializer = OrganizationSerializer(organizations, many=True)
        data = serializer.data
        redis_cache.set(cache_key, data, ttl=1800)  # 30 минут
        return Response(data)


class CourseListAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role == 'organization':
            organization = request.user.organizations.first()
            org_pk = organization.pk if organization else 'none'
            cache_key = f'courses:org:{org_pk}'
        else:
            cache_key = 'courses:all'

        cached = redis_cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        if request.user.role == 'organization':
            organization = request.user.organizations.first()
            if organization:
                courses = Course.objects.filter(organization=organization)
            else:
                courses = Course.objects.none()
        else:
            courses = Course.objects.all()

        serializer = CourseSerializer(courses, many=True)
        data = serializer.data
        redis_cache.set(cache_key, data, ttl=900)  # 15 минут
        return Response(data)


class CourseCreateAPIView(generics.CreateAPIView):
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizationOwner]


class CourseDetailAPIView(views.APIView):
    @swagger_auto_schema(request_body=CourseSerializer, responses={200: CourseSerializer, 400: 'Bad Request', 404: 'Course not found'})
    def patch(self, request, pk=None):
        course = get_object_or_404(Course, pk=pk)
        self.check_object_permissions(request, course)
        serializer = CourseSerializer(data=request.data,
                                      context={'request': request},
                                      instance=course,
                                      partial=True)
        if serializer.is_valid():
            course = serializer.save()
            return Response(CourseSerializer(course).data, status=200)
        return Response(serializer.errors, status=400)

    @swagger_auto_schema(responses={200: CourseSerializer, 404: 'Course not found'})
    def get(self, request, pk=None):
        course = get_object_or_404(Course, pk=pk)
        serializer = CourseSerializer(course)
        return Response(serializer.data)

    def delete(self, request, pk=None):
        course = get_object_or_404(Course, pk=pk)
        # Проверяем, что пользователь является владельцем организации, которой принадлежит курс
        if request.user.role != 'organization' or course.organization.owner != request.user:
            return Response({'error': 'У вас нет прав для удаления этого курса'}, status=403)
        course.delete()
        return Response({'message': 'Курс успешно удален'}, status=204)

    def get_permissions(self):
        if self.request.method in ['PATCH', 'DELETE']:
            return [permissions.IsAuthenticated(), IsOrganizationOwner()]
        return [permissions.IsAuthenticated()]


class EventViewSet(ReadOnlyModelViewSet):
    queryset = Event.objects.all().order_by('date')
    serializer_class = EventSerializer
    permission_classes = [permissions.AllowAny]

    def list(self, request, *args, **kwargs):
        cache_key = 'events:list'
        cached = redis_cache.get(cache_key)
        if cached is not None:
            return Response(cached)
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data
        redis_cache.set(cache_key, data, ttl=3600)  # 1 час
        return Response(data)

class ExamViewSet(viewsets.ModelViewSet):
    queryset = Exam.objects.all().order_by('level')
    serializer_class = ExamSerializer

    def get_queryset(self):
        queryset = Exam.objects.select_related('author').prefetch_related('questions__choices').order_by('level')
        if getattr(self, 'swagger_fake_view', False):
            return queryset.none()

        if self.request.user.role == 'organization':
            return queryset.filter(author=self.request.user.organizations.first())

        return queryset
    def get_serializer_class(self):
        if self.request.method in ['POST', 'PUT', 'PATCH']:
            return ExamCreateSerializer
        return ExamSerializer

    def get_permissions(self):
        if self.request.method in ['POST', 'PUT', 'DELETE', 'PATCH']:
            return [permissions.IsAuthenticated(), IsOrganizationOwner()]
        return [permissions.IsAuthenticated()]


@swagger_auto_schema(request_body=SubmitExamSerializer, methods=['post'])
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def submit_exam(request):
    serializer = SubmitExamSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    exam = get_object_or_404(
        Exam.objects.prefetch_related('questions__choices'),
        pk=serializer.validated_data['exam_id'],
    )
    questions = {question.number: question for question in exam.questions.all()}
    total_points = sum(question.point for question in questions.values())
    if not questions or total_points <= 0:
        raise ValidationError('В экзамене нет вопросов с положительными баллами.')
    if len(questions) != len(exam.questions.all()):
        raise ValidationError('В экзамене повторяются номера вопросов. Обратитесь к автору.')

    score = 0
    right_answers = 0
    for answer in serializer.validated_data['answers']:
        question = questions.get(answer['question_number'])
        if question is None:
            raise ValidationError('Ответ содержит неизвестный номер вопроса.')
        if not answer['text']:
            continue
        choice = next((choice for choice in question.choices.all()
                       if choice.text == answer['text']), None)
        if choice is None:
            raise ValidationError('Такого варианта ответа нет в вопросе.')
        if choice.is_correct:
            score += question.point
            right_answers += 1

    result_percent = score / total_points * 100
    passed = result_percent >= PERCENT_TO_PASS_EXAM
    if passed:
        # Сериализуем одновременные отправки пользователя, включая первый результат.
        with transaction.atomic():
            User.objects.select_for_update().get(pk=request.user.pk)
            result = Result.objects.filter(user=request.user, exam=exam).order_by('-score', '-pk').first()
            if result is None:
                Result.objects.create(user=request.user, exam=exam, score=score)
            elif result.score < score:
                result.score = score
                result.save(update_fields=['score'])
    return Response({
        'result': 'passed' if passed else 'failed',
        'score': score,
        'percent': result_percent,
        'right_answers': right_answers
    }, status=200)


class ResultRetrieveAPIView(generics.RetrieveAPIView):
    queryset = Result.objects.all()
    serializer_class = ResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Result.objects.none()
        user = self.request.user
        return Result.objects.filter(user=user)

    def get_object(self):
        obj = get_object_or_404(self.get_queryset(), pk=self.kwargs['pk'])
        return obj


class ResultListAPIView(generics.ListAPIView):
    serializer_class = ResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Result.objects.filter(user=user).order_by('-completed_at')



@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def run_update_events(request):
    """
    Запускает задачу обновления событий через Celery.
    Возвращает task_id для последующей проверки статуса.
    """
    task = update_events_task.delay()
    return Response({'task_id': task.id, 'status': 'queued'}, status=202)


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def task_status(request, task_id):
    """
    Возвращает статус и результат Celery-задачи по task_id (AsyncResult).
    """
    result = celery_app.AsyncResult(task_id)
    data = {
        'task_id': task_id,
        'status': result.status,
        'ready': result.ready(),
    }
    if result.ready():
        if result.successful():
            data['result'] = result.result
        else:
            data['error'] = str(result.result)
    return Response(data)


class EnrollmentViewSet(mixins.CreateModelMixin,
                        mixins.ListModelMixin,
                        viewsets.GenericViewSet):
    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Enrollment.objects.filter(user=self.request.user)
