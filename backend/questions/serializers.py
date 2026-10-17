from rest_framework import serializers
from .models import Question, TestCase, CodeTemplate


class TestCaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestCase
        fields = ['id', 'input_data', 'expected_output', 'is_hidden']


class CodeTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CodeTemplate
        fields = ['id', 'language', 'starter_code', 'driver_code']


class StudentCodeTemplateSerializer(serializers.ModelSerializer):
    """Students only ever see the starter stub - never the hidden driver."""
    class Meta:
        model = CodeTemplate
        fields = ['language', 'starter_code']


class QuestionSerializer(serializers.ModelSerializer):
    test_cases = TestCaseSerializer(many=True, required=False)
    code_templates = CodeTemplateSerializer(many=True, required=False)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'title', 'description', 'difficulty', 'sample_input',
                  'sample_output', 'created_by', 'created_by_name', 'created_at', 'test_cases',
                  'code_templates', 'time_limit_seconds', 'duration_minutes', 'is_active']
        read_only_fields = ['created_by']

    def create(self, validated_data):
        test_cases_data = validated_data.pop('test_cases', [])
        templates_data = validated_data.pop('code_templates', [])
        question = Question.objects.create(**validated_data)
        for tc in test_cases_data:
            TestCase.objects.create(question=question, **tc)
        for tpl in templates_data:
            CodeTemplate.objects.create(question=question, **tpl)
        return question

    def update(self, instance, validated_data):
        test_cases_data = validated_data.pop('test_cases', None)
        templates_data = validated_data.pop('code_templates', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if test_cases_data is not None:
            instance.test_cases.all().delete()
            for tc in test_cases_data:
                TestCase.objects.create(question=instance, **tc)
        if templates_data is not None:
            instance.code_templates.all().delete()
            for tpl in templates_data:
                CodeTemplate.objects.create(question=instance, **tpl)
        return instance


class QuestionForStudentSerializer(serializers.ModelSerializer):
    """Students should not see hidden test cases' data directly in the list."""
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    started_at = serializers.DateTimeField(read_only=True, required=False)
    locked = serializers.SerializerMethodField()
    solved = serializers.SerializerMethodField()
    submitted = serializers.SerializerMethodField()
    code_templates = StudentCodeTemplateSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'title', 'description', 'difficulty', 'sample_input',
                  'sample_output', 'created_by_name', 'created_at',
                  'time_limit_seconds', 'duration_minutes', 'started_at', 'locked', 'solved',
                  'submitted', 'code_templates']

    def get_locked(self, obj):
        # List view supplies a precomputed set (see StudentQuestionListView);
        # detail view sets `question.locked` directly on the instance instead.
        locked_ids = self.context.get('locked_ids')
        if locked_ids is not None:
            return obj.id in locked_ids
        return getattr(obj, 'locked', False)

    def get_solved(self, obj):
        solved_ids = self.context.get('solved_ids')
        if solved_ids is not None:
            return obj.id in solved_ids
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            from submissions.models import Submission
            return Submission.objects.filter(student=request.user, question=obj, status='Accepted').exists()
        return False

    def get_submitted(self, obj):
        # Students get exactly one submission per question; `submitted` tells
        # the UI to show Reattempt / "Submitted - Not Solved" states.
        submitted_ids = self.context.get('submitted_ids')
        if submitted_ids is not None:
            return obj.id in submitted_ids
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            from submissions.models import Submission
            return Submission.objects.filter(student=request.user, question=obj).exists()
        return False
