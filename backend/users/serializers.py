from rest_framework import serializers
from djoser.serializers import UserCreateSerializer as BaseUserCreateSerializer
from djoser.serializers import UserSerializer as BaseUserSerializer
from .models import User


class UserCreateSerializer(BaseUserCreateSerializer):
    role = serializers.ChoiceField(choices=['user', 'organization'], default='user')

    class Meta(BaseUserCreateSerializer.Meta):
        model = User
        fields = ('id', 'email', 'password', 'first_name', 'last_name',
                  'patronymic', 'phone', 'role')
        extra_kwargs = {'password': {'write_only': True}}


class UserSerializer(BaseUserSerializer):
    class Meta(BaseUserSerializer.Meta):
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'patronymic',
                  'phone', 'role')
        read_only_fields = ('id', 'email', 'role')


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'patronymic', 'phone']
        extra_kwargs = {
            'email': {'read_only': True}
        }
