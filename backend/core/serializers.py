from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    UserProfile, Store, InspectionItem, TaskTemplate,
    InspectionTask, TaskReassignment, TaskItemResult, ReviewRecord,
    RectificationRecord, SystemConfig
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
    task_status_display = serializers.SerializerMethodField()

    class Meta:
        model = TaskReassignment
        fields = ['id', 'task', 'original_executor', 'original_executor_detail', 
                  'new_executor', 'new_executor_detail', 'reason', 
                  'task_status_at_time', 'task_status_display', 'operator', 
                  'operator_detail', 'created_at']
        read_only_fields = ['original_executor', 'task_status_at_time', 'operator', 'created_at']

    def get_task_status_display(self, obj):
        status_map = dict(InspectionTask.STATUS_CHOICES)
        return status_map.get(obj.task_status_at_time, obj.task_status_at_time)


class ReviewRecordSerializer(serializers.ModelSerializer):
    reviewer_detail = UserSerializer(source='reviewer', read_only=True)

    class Meta:
        model = ReviewRecord
        fields = ['id', 'task', 'reviewer', 'reviewer_detail', 'is_approved', 
                  'comment', 'rectification_deadline', 'created_at']
        read_only_fields = ['reviewer', 'created_at']


class RectificationRecordSerializer(serializers.ModelSerializer):
    review_record_detail = ReviewRecordSerializer(source='review_record', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = RectificationRecord
        fields = ['id', 'task', 'round_number', 'review_record', 'review_record_detail',
                  'description', 'rectification_deadline', 'submitted_at',
                  'is_overdue', 'created_at', 'updated_at']
        read_only_fields = ['round_number', 'submitted_at', 'created_at', 'updated_at']


class InspectionTaskListSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    executor_detail = UserSerializer(source='executor', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    latest_reassignment_summary = serializers.SerializerMethodField()
    rectification_status = serializers.CharField(read_only=True)
    current_rectification_round = serializers.IntegerField(read_only=True)
    latest_rectification_submitted_at = serializers.SerializerMethodField()
    latest_rectification_is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = InspectionTask
        fields = ['id', 'title', 'store', 'store_name', 'executor', 'executor_detail',
                  'status', 'status_display', 'deadline', 'created_at', 'updated_at',
                  'executed_at', 'latest_reassignment_summary', 'rectification_status',
                  'current_rectification_round', 'latest_rectification_submitted_at',
                  'latest_rectification_is_overdue']

    def get_latest_reassignment_summary(self, obj):
        latest = obj.latest_reassignment
        if latest:
            status_map = dict(InspectionTask.STATUS_CHOICES)
            return {
                'id': latest.id,
                'original_executor': latest.original_executor.username if latest.original_executor else None,
                'new_executor': latest.new_executor.username if latest.new_executor else None,
                'reason': latest.reason,
                'task_status_at_time': latest.task_status_at_time,
                'task_status_display': status_map.get(latest.task_status_at_time, latest.task_status_at_time),
                'created_at': latest.created_at
            }
        return None

    def get_latest_rectification_submitted_at(self, obj):
        latest = obj.rectifications.order_by('-round_number').first()
        return latest.submitted_at if latest else None

    def get_latest_rectification_is_overdue(self, obj):
        latest = obj.rectifications.order_by('-round_number').first()
        return latest.is_overdue if latest else False


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
    rectifications = RectificationRecordSerializer(many=True, read_only=True)
    rectification_status = serializers.CharField(read_only=True)
    current_rectification_round = serializers.IntegerField(read_only=True)
    timeline = serializers.SerializerMethodField()

    class Meta:
        model = InspectionTask
        fields = ['id', 'title', 'store', 'store_detail', 'template', 'template_detail',
                  'executor', 'executor_detail', 'reviewer', 'reviewer_detail',
                  'created_by', 'created_by_detail', 'status', 'status_display',
                  'deadline', 'remark', 'created_at', 'updated_at', 'executed_at',
                  'reviewed_at', 'item_results', 'reassignments', 'reviews',
                  'rectifications', 'rectification_status', 'current_rectification_round',
                  'rectification_deadline_days', 'timeline']

    def get_timeline(self, obj):
        events = []
        events.append({
            'type': 'created',
            'label': '任务创建',
            'time': obj.created_at,
            'detail': f'创建人: {obj.created_by.username if obj.created_by else "未知"}',
        })

        first_submission = True
        for rect in obj.rectifications.all().order_by('round_number'):
            review = rect.review_record
            if not review.is_approved:
                events.append({
                    'type': 'rejected',
                    'label': f'复核驳回(进入第{rect.round_number}轮整改)',
                    'time': review.created_at,
                    'detail': review.comment or '',
                })
                if rect.rectification_deadline:
                    events.append({
                        'type': 'deadline_set',
                        'label': f'整改截止时间设定',
                        'time': rect.created_at,
                        'detail': f'第{rect.round_number}轮整改截止: {rect.rectification_deadline.strftime("%Y-%m-%d %H:%M")}',
                    })
            if rect.submitted_at:
                events.append({
                    'type': 'rectification_submitted',
                    'label': f'整改提交(第{rect.round_number}轮)',
                    'time': rect.submitted_at,
                    'detail': rect.description or '',
                })

        if obj.executed_at and not obj.rectifications.filter(round_number=1, submitted_at__isnull=False).exists():
            events.append({
                'type': 'executed',
                'label': '首次提交执行结果',
                'time': obj.executed_at,
                'detail': f'执行人: {obj.executor.username if obj.executor else "未知"}',
            })

        for review in obj.reviews.all():
            if review.is_approved:
                rect = obj.rectifications.filter(review_record=review).first()
                label = '复核通过'
                if rect:
                    label = f'复核通过(第{rect.round_number}轮整改后)' if rect.submitted_at else '复核通过'
                events.append({
                    'type': 'approved',
                    'label': label,
                    'time': review.created_at,
                    'detail': review.comment or '',
                })

        events.sort(key=lambda e: e['time'] if e['time'] else obj.created_at)
        return events


class InspectionTaskCreateSerializer(serializers.ModelSerializer):
    item_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)

    class Meta:
        model = InspectionTask
        fields = ['id', 'title', 'store', 'template', 'executor', 'reviewer',
                  'deadline', 'remark', 'item_ids', 'rectification_deadline_days']

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
    rectification_deadline_days = serializers.IntegerField(required=False, default=3)


class SystemConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemConfig
        fields = ['id', 'key', 'value', 'updated_at']
        read_only_fields = ['updated_at']
