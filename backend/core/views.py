from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from django.utils import timezone
from .models import (
    Store, InspectionItem, TaskTemplate,
    InspectionTask, TaskReassignment, TaskItemResult, ReviewRecord
)
from .serializers import (
    UserSerializer, UserCreateSerializer, StoreSerializer,
    InspectionItemSerializer, TaskTemplateSerializer,
    InspectionTaskListSerializer, InspectionTaskDetailSerializer,
    InspectionTaskCreateSerializer, TaskItemResultSerializer,
    TaskReassignmentSerializer, ReviewRecordSerializer,
    BatchTaskCreateSerializer
)


class IsManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.profile.role == 'manager'


class IsExecutor(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.profile.role == 'executor'


class IsReviewer(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.profile.role == 'reviewer'


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['create']:
            return UserCreateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action in ['create']:
            return [IsManager()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def executors(self, request):
        users = User.objects.filter(profile__role='executor')
        serializer = self.get_serializer(users, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def reviewers(self, request):
        users = User.objects.filter(profile__role='reviewer')
        serializer = self.get_serializer(users, many=True)
        return Response(serializer.data)


class StoreViewSet(viewsets.ModelViewSet):
    queryset = Store.objects.all()
    serializer_class = StoreSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManager()]
        return [permissions.IsAuthenticated()]


class InspectionItemViewSet(viewsets.ModelViewSet):
    queryset = InspectionItem.objects.all()
    serializer_class = InspectionItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManager()]
        return [permissions.IsAuthenticated()]


class TaskTemplateViewSet(viewsets.ModelViewSet):
    queryset = TaskTemplate.objects.all()
    serializer_class = TaskTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManager()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class InspectionTaskViewSet(viewsets.ModelViewSet):
    queryset = InspectionTask.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return InspectionTaskListSerializer
        elif self.action in ['create']:
            return InspectionTaskCreateSerializer
        return InspectionTaskDetailSerializer

    def get_queryset(self):
        queryset = InspectionTask.objects.all()
        user = self.request.user
        role = user.profile.role

        if role == 'executor':
            queryset = queryset.filter(executor=user)
        elif role == 'reviewer':
            queryset = queryset.filter(reviewer=user)

        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset.order_by('-created_at')

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManager()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, status='pending')

    @action(detail=False, methods=['post'], permission_classes=[IsManager])
    def batch_create(self, request):
        serializer = BatchTaskCreateSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            template = TaskTemplate.objects.get(id=data['template_id'])
            executor = User.objects.get(id=data['executor_id'])
            reviewer = User.objects.get(id=data['reviewer_id']) if data.get('reviewer_id') else None

            created_tasks = []
            for store_id in data['store_ids']:
                store = Store.objects.get(id=store_id)
                task = InspectionTask.objects.create(
                    title=f"{data['title_prefix']} - {store.name}",
                    store=store,
                    template=template,
                    executor=executor,
                    reviewer=reviewer,
                    created_by=request.user,
                    deadline=data.get('deadline'),
                    remark=data.get('remark', ''),
                    status='pending'
                )
                for item in template.items.all():
                    TaskItemResult.objects.create(task=task, item=item)
                created_tasks.append(task)

            result_serializer = InspectionTaskListSerializer(created_tasks, many=True)
            return Response(result_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsManager])
    def reassign(self, request, pk=None):
        task = self.get_object()
        new_executor_id = request.data.get('new_executor_id')
        reason = request.data.get('reason', '')

        if not new_executor_id:
            return Response({'error': '请指定新的执行者'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            new_executor = User.objects.get(id=new_executor_id)
        except User.DoesNotExist:
            return Response({'error': '用户不存在'}, status=status.HTTP_404_NOT_FOUND)

        original_executor = task.executor

        TaskReassignment.objects.create(
            task=task,
            original_executor=original_executor,
            new_executor=new_executor,
            reason=reason,
            task_status_at_time=task.status,
            operator=request.user
        )

        task.executor = new_executor
        task.save()

        serializer = self.get_serializer(task)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def start_execution(self, request, pk=None):
        task = self.get_object()
        if task.status != 'pending':
            return Response({'error': '任务状态不允许开始执行'}, status=status.HTTP_400_BAD_REQUEST)
        if request.user.profile.role != 'executor' or task.executor != request.user:
            return Response({'error': '只有任务执行者可以开始执行'}, status=status.HTTP_403_FORBIDDEN)

        task.status = 'executing'
        task.save()
        serializer = self.get_serializer(task)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def submit_result(self, request, pk=None):
        task = self.get_object()
        if task.status not in ['executing', 'rejected']:
            return Response({'error': '任务状态不允许提交结果'}, status=status.HTTP_400_BAD_REQUEST)
        if request.user.profile.role != 'executor' or task.executor != request.user:
            return Response({'error': '只有任务执行者可以提交结果'}, status=status.HTTP_403_FORBIDDEN)

        results = request.data.get('results', [])
        for result_data in results:
            result_id = result_data.get('id')
            try:
                result = TaskItemResult.objects.get(id=result_id, task=task)
                result.result = result_data.get('result', result.result)
                result.photo_placeholder = result_data.get('photo_placeholder', result.photo_placeholder)
                result.rectification_suggestion = result_data.get('rectification_suggestion', result.rectification_suggestion)
                result.is_pass = result_data.get('is_pass', result.is_pass)
                result.save()
            except TaskItemResult.DoesNotExist:
                pass

        task.status = 'reviewing'
        task.executed_at = timezone.now()
        task.save()

        serializer = self.get_serializer(task)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        task = self.get_object()
        if task.status != 'reviewing':
            return Response({'error': '任务状态不允许复核'}, status=status.HTTP_400_BAD_REQUEST)
        if request.user.profile.role != 'reviewer' or task.reviewer != request.user:
            return Response({'error': '只有任务复核者可以复核'}, status=status.HTTP_403_FORBIDDEN)

        is_approved = request.data.get('is_approved')
        comment = request.data.get('comment', '')
        rectification_deadline = request.data.get('rectification_deadline')

        if is_approved is None:
            return Response({'error': '请指定复核结果'}, status=status.HTTP_400_BAD_REQUEST)

        ReviewRecord.objects.create(
            task=task,
            reviewer=request.user,
            is_approved=is_approved,
            comment=comment,
            rectification_deadline=rectification_deadline
        )

        if is_approved:
            task.status = 'finished'
        else:
            task.status = 'rejected'
        task.reviewed_at = timezone.now()
        task.save()

        serializer = self.get_serializer(task)
        return Response(serializer.data)


class TaskItemResultViewSet(viewsets.ModelViewSet):
    queryset = TaskItemResult.objects.all()
    serializer_class = TaskItemResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = TaskItemResult.objects.all()
        task_id = self.request.query_params.get('task_id')
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        return queryset
