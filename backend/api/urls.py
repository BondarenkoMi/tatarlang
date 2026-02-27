from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import (OrganizationAPIView,
                    OrganizationListAPIView, CourseListAPIView,
                    CourseCreateAPIView, UserProfileView,
                    EventViewSet, ExamViewSet,
                    submit_exam, ResultRetrieveAPIView,
                    ResultListAPIView, EnrollmentViewSet,
                    CourseDetailAPIView, OrganizationCreateRetrieveUpdateAPIView,
                    run_update_events, task_status)


router = SimpleRouter()
router.register('events', EventViewSet, basename='events')
router.register('enrollments', EnrollmentViewSet, basename='enrollments')

urlpatterns = [
    path('v1/', include('djoser.urls')),
    path('v1/', include('djoser.urls.jwt')),
    path('v1/user/profile/', UserProfileView.as_view(), name='user-profile'),
    path('v1/organization/me', OrganizationCreateRetrieveUpdateAPIView.as_view(),
         name='organization_me'),
    path('v1/organization/<int:pk>', OrganizationAPIView.as_view(),
         name='organization_detail'),
    path('v1/organization/', OrganizationListAPIView.as_view(),
         name='organization_list'),
    path('v1/course/', CourseListAPIView.as_view(), name='course_list'),
    path('v1/course/create', CourseCreateAPIView.as_view(), name='course_create'),
    path('v1/course/<int:pk>', CourseDetailAPIView.as_view(), name='course_detail'),
    path('v1/exam/', ExamViewSet.as_view({'get': 'list', 'post': 'create'}), name='exam_list_create'),
    path('v1/exam/<int:pk>', ExamViewSet.as_view({'get': 'retrieve', 'patch': 'update', 'delete': 'destroy'}), name='exam_detail'),
    path('v1/exam/submit', submit_exam, name='submit_exam'),
    path('v1/result/', ResultListAPIView.as_view(), name='result_list'),
    path('v1/result/<int:pk>', ResultRetrieveAPIView.as_view(), name='result_detail'),
    path('v1/', include(router.urls)),
    # Celery Task API (Part 4)
    path('v1/tasks/run-events/', run_update_events, name='task_run_events'),
    path('v1/tasks/<str:task_id>/', task_status, name='task_status'),
]
