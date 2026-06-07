from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    UserProfile, Store, InspectionItem, TaskTemplate,
    InspectionTask, TaskReassignment, TaskItemResult, ReviewRecord
)


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['id', 'role', 'phone']


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    role = serializers.CharField(source='profile.role', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile', 'role']


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=UserProfile.ROLE_CHOICES, write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'email', 'first_name', 'last_name', 'role']

    def create(self, validated_data):
        role = validated_data.pop('role')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        user.profile.role = role
        user.profile.save()
        return user


class StoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Store
        fields = '__all__'


class InspectionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InspectionItem
        fields = '__all__'


class TaskTemplateSerializer(serializers.ModelSerializer):
    items_detail = InspectionItemSerializer(source='items', many=True, read_only=True)
    item_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)

    class Meta:
        model = TaskTemplate
        fields = ['id', 'name', 'description', 'items', 'items_detail', 'item_ids', 'created_by', 'created_at', 'is_active']
        read_only_fields = ['created_by', 'created_at']

    def create(self, validated_data):
        item_ids = validated_data.pop('item_ids', [])
        template = TaskTemplate.objects.create(**validated_data)
        if item_ids:
            template.items.set(item_ids)
        return template

    def update(self, instance, validated_data):
        item_ids = validated_data.pop('item_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if item_ids is not None:
            instance.items.set(item_ids)
        return instance


class TaskItemResultSerializer(serializers.ModelSerializer):
    item_detail = InspectionItemSerializer(source='item', read_only=True)

    class Meta:
        model = TaskItemResult
        fields = ['id', 'task', 'item', 'item_detail', 'result', 'photo_placeholder', 
                  'rectification_suggestion', 'is_pass', 'created_at', 'updated_at']


class TaskReassignmentSerializer(serializers.ModelSerializer):
    original_executor_detail = UserSerializer(source='original_executor', read_only=True)
    new_executor_detail = UserSerializer(source='new_executor', read_only=True)
    operator_detail = UserSerializer(source='operator', read_only=True)
    task_status_display = serializers.CharField(source='get_task_status_at_time_display', read_only=True)

    class Meta:
        model = TaskReassignment
        fields = ['id', 'task', 'original_executor', 'original_executor_detail', 
                  'new_executor', 'new_executor_detail', 'reason', 
                  'task_status_at_time', 'task_status_display', 'operator', 
                  'operator_detail', 'created_at']
        read_only_fields = ['original_executor', 'task_status_at_time', 'operator', 'created_at']


class ReviewRecordSerializer(serializers.ModelSerializer):
    reviewer_detail = UserSerializer(source='reviewer', read_only=True)

    class Meta:
        model = ReviewRecord
        fields = ['id', 'task', 'reviewer', 'reviewer_detail', 'is_approved', 
                  'comment', 'rectification_deadline', 'created_at']
        read_only_fields = ['reviewer', 'created_at']


class InspectionTaskListSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    executor_detail = UserSerializer(source='executor', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    latest_reassignment_summary = serializers.SerializerMethodField()

    class Meta:
        model = InspectionTask
        fields = ['id', 'title', 'store', 'store_name', 'executor', 'executor_detail',
                  'status', 'status_display', 'deadline', 'created_at', 'updated_at',
                  'latest_reassignment_summary']

    def get_latest_reassignment_summary(self, obj):
        latest = obj.latest_reassignment
        if latest:
            return {
                'id': latest.id,
                'original_executor': latest.original_executor.username if latest.original_executor else None,
                'new_executor': latest.new_executor.username if latest.new_executor else None,
                'reason': latest.reason,
                'created_at': latest.created_at
            }
        return None


class InspectionTaskDetailSerializer(serializers.ModelSerializer):
    store_detail = StoreSerializer(source='store', read_only=True)
    template_detail = TaskTemplateSerializer(source='template', read_only=True)
    executor_detail = UserSerializer(source='executor', read_only=True)
    reviewer_detail = UserSerializer(source='reviewer', read_only=True)
    created_by_detail = UserSerializer(source='created_by', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    item_results = TaskItemResultSerializer(source='taskitemresult_set', many=True, read_only=True)
    reassignments = TaskReassignmentSerializer(many=True, read_only=True)
    reviews = ReviewRecordSerializer(many=True, read_only=True)

    class Meta:
        model = InspectionTask
        fields = ['id', 'title', 'store', 'store_detail', 'template', 'template_detail',
                  'executor', 'executor_detail', 'reviewer', 'reviewer_detail',
                  'created_by', 'created_by_detail', 'status', 'status_display',
                  'deadline', 'remark', 'created_at', 'updated_at', 'executed_at',
                  'reviewed_at', 'item_results', 'reassignments', 'reviews']


class InspectionTaskCreateSerializer(serializers.ModelSerializer):
    item_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)

    class Meta:
        model = InspectionTask
        fields = ['id', 'title', 'store', 'template', 'executor', 'reviewer',
                  'deadline', 'remark', 'item_ids']

    def create(self, validated_data):
        item_ids = validated_data.pop('item_ids', [])
        template = validated_data.get('template')
        if template and not item_ids:
            item_ids = list(template.items.values_list('id', flat=True))
        task = InspectionTask.objects.create(**validated_data)
        for item_id in item_ids:
            TaskItemResult.objects.create(task=task, item_id=item_id)
        return task


class BatchTaskCreateSerializer(serializers.Serializer):
    title_prefix = serializers.CharField()
    store_ids = serializers.ListField(child=serializers.IntegerField())
    template_id = serializers.IntegerField()
    executor_id = serializers.IntegerField()
    reviewer_id = serializers.IntegerField(required=False, allow_null=True)
    deadline = serializers.DateTimeField(required=False, allow_null=True)
    remark = serializers.CharField(required=False, allow_blank=True)
