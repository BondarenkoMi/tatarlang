from rest_framework import serializers
from django.db import transaction
from .models import Exam, Result, Choice, Question


class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ['id', 'text', 'is_correct']
        read_only_fields = ['id']

    def validate_text(self, value):
        if not value.strip():
            raise serializers.ValidationError("Текст варианта ответа не может быть пустым.")
        return value


class ChoiceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ['text', 'is_correct']

    def validate_text(self, value):
        if not value.strip():
            raise serializers.ValidationError("Текст варианта ответа не может быть пустым.")
        return value


class QuestionCreateSerializer(serializers.ModelSerializer):
    choices = ChoiceCreateSerializer(many=True)
    number = serializers.IntegerField(min_value=1)

    class Meta:
        model = Question
        fields = ['text', 'point', 'choices', 'number']
        extra_kwargs = {
            'exam': {'required': False}
        }

    def validate_text(self, value):
        if not value.strip():
            raise serializers.ValidationError("Текст вопроса не может быть пустым.")
        return value

    def validate_point(self, value):
        if value < 1 or value > 10:
            raise serializers.ValidationError("Баллы за вопрос должны быть от 1 до 10.")
        return value

    def validate_choices(self, value):
        if len(value) < 2:
            raise serializers.ValidationError("Должно быть минимум 2 варианта ответа.")
        if not any(choice.get('is_correct', False) for choice in value):
            raise serializers.ValidationError("Хотя бы один вариант должен быть помечен как правильный.")
        texts = [choice['text'] for choice in value]
        if len(texts) != len(set(texts)):
            raise serializers.ValidationError('Варианты ответа не должны повторяться.')
        return value

    def create(self, validated_data):
        choices_data = validated_data.pop('choices')
        question = Question.objects.create(**validated_data)
        for choice_data in choices_data:
            Choice.objects.create(question=question, **choice_data)
        return question


class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True)

    class Meta:
        model = Question
        fields = ['id', 'text', 'point', 'number', 'choices']
        read_only_fields = ['id', 'number']
        


class ExamSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user is None or not user.is_authenticated or instance.author.owner_id != user.pk:
            for question in data['questions']:
                for choice in question['choices']:
                    choice.pop('is_correct', None)
        return data

    class Meta:
        model = Exam
        fields = ['id', 'title', 'description', 'level', 'questions', 'author']


class ExamCreateSerializer(serializers.ModelSerializer):
    questions = QuestionCreateSerializer(many=True, allow_empty=False)

    class Meta:
        model = Exam
        fields = ['id', 'title', 'description', 'level', 'questions']
        read_only_fields = ['id']

    def validate_questions(self, value):
        # PATCH может менять метаданные; переданный список вопросов заменяется целиком.
        nested = QuestionCreateSerializer(data=value, many=True, allow_empty=False)
        nested.is_valid(raise_exception=True)
        numbers = [question['number'] for question in nested.validated_data]
        if len(numbers) != len(set(numbers)):
            raise serializers.ValidationError('Номера вопросов должны быть уникальными.')
        return nested.validated_data

    def _create_questions(self, exam, questions_data):
        for question_data in questions_data:
            choices_data = question_data.pop('choices')
            question = Question.objects.create(exam=exam, **question_data)
            Choice.objects.bulk_create([
                Choice(question=question, **choice_data) for choice_data in choices_data
            ])

    @transaction.atomic
    def create(self, validated_data):
        user = self.context['request'].user
        organization = user.organizations.first()
        if user.role != 'organization' or organization is None:
            raise serializers.ValidationError('Сначала создайте организацию.')
        questions_data = validated_data.pop('questions')
        exam = Exam.objects.create(author=organization, **validated_data)
        self._create_questions(exam, questions_data)
        return exam

    @transaction.atomic
    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions', None)
        instance = super().update(instance, validated_data)
        if questions_data is not None:
            instance.questions.all().delete()
            self._create_questions(instance, questions_data)
        return instance


class ResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = Result
        fields = ['id', 'user', 'exam', 'score', 'completed_at']
        read_only_fields = ['user', 'completed_at', 'exam']

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['user'] = request.user
        return super().create(validated_data)


class SubmitAnswerSerializer(serializers.Serializer):
    question_number = serializers.IntegerField(min_value=1, help_text='Номер вопроса')
    text = serializers.CharField(allow_blank=True, help_text='Текст ответа')

class SubmitExamSerializer(serializers.Serializer):
    exam_id = serializers.IntegerField(min_value=1, help_text='ID экзамена')
    answers = SubmitAnswerSerializer(many=True, allow_empty=False, help_text='Список ответов на вопросы экзамена')

    def validate_answers(self, value):
        numbers = [answer['question_number'] for answer in value]
        if len(numbers) != len(set(numbers)):
            raise serializers.ValidationError('На каждый вопрос можно ответить только один раз.')
        return value
