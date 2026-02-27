from events.tasks import update_events_task
from tatarlang.celery import app as celery_app
from tatarlang.cache import cache as redis_cache
from rest_framework import generics, permissions, views, viewsets, mixins
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet
from django.contrib.auth import get_user_model
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
        return get_object_or_404(Organization, owner=self.request.user)

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
        if getattr(self, 'swagger_fake_view', False):
            return Exam.objects.none()
        if self.request.user.role == 'organization':
            return self.queryset.filter(author=self.request.user.organizations.first())
        return self.queryset
    
    def get_serializer_class(self):
        if self.request.method in ['POST', 'PUT']:
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
    exam_id = request.data.get('exam_id')
    answers = request.data.get('answers', [])

    if not exam_id or not answers:
        return Response({'error': 'exam_id и answers обязательны'}, status=400)

    exam = get_object_or_404(Exam, id=exam_id)
    score = 0
    right_answers = 0
    for answer in answers:
        question_number = answer['question_number']
        text = answer['text']
        if not question_number or not text:
            continue

        question = exam.questions.filter(number=question_number).first()
        if not question:
            continue

        selected_choice = question.choices.filter(text=text).first()
        if selected_choice and selected_choice.is_correct:
            score += question.point
            right_answers += 1

    result_percent = score / exam.total_points * 100
    passed = result_percent >= PERCENT_TO_PASS_EXAM

    if passed:
        result = Result.objects.filter(user=request.user, exam=exam).first()
        if result:
            if result.score < score:
                result.score = score
                result.save()
        result = Result.objects.create(user=request.user, exam=exam, score=score)
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


# =============================================================================
# Celery Task API (Part 4)
# =============================================================================

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def run_update_events(request):
    """
    Запускает задачу обновления событий через Celery.
    Возвращает task_id для последующей проверки статуса.
    """
    task = update_events_task.delay()
    return Response({'task_id': task.id, 'status': 'queued'}, status=202)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
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
