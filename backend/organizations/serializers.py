from .models import Organization, Course, Enrollment
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = '__all__'
        read_only_fields = ('owner', 'created_at')

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get('request')
        get_user_model().objects.select_for_update().get(pk=request.user.pk)
        if request.user.organizations.exists():
            raise serializers.ValidationError('У вас уже есть организация.')
        validated_data['owner'] = request.user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        request = self.context.get('request')
        if request.user != instance.owner:
            raise serializers.ValidationError("You do not have permission to update this organization.")
        return super().update(instance, validated_data)


class CourseSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    class Meta:
        model = Course
        fields = '__all__'
        read_only_fields = ('organization', 'created_at')

    def create(self, validated_data):
        request = self.context.get('request')
        organization = request.user.organizations.first()
        if organization is None:
            raise serializers.ValidationError('Сначала создайте организацию.')
        validated_data['organization'] = organization
        return super().create(validated_data)

    def update(self, instance, validated_data):
        request = self.context.get('request')
        if request.user.role != 'organization' or instance.organization.owner_id != request.user.pk:
            raise serializers.ValidationError("You do not have permission to update this course.")
        return super().update(instance, validated_data)


class EnrollmentSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source='course.name', read_only=True)

    class Meta:
        model = Enrollment
        fields = ['id', 'course', 'course_name', 'created_at']
        read_only_fields = ['created_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        enrollment, _ = Enrollment.objects.get_or_create(**validated_data)
        return enrollment
