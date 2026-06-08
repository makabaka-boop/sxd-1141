from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class UserProfile(models.Model):
    ROLE_CHOICES = (
        ('manager', '管理者'),
        ('executor', '执行者'),
        ('reviewer', '复核者'),
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    phone = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.user.username} - {self.get_role_display()}'


class Store(models.Model):
    name = models.CharField(max_length=100)
    address = models.CharField(max_length=255)
    manager_name = models.CharField(max_length=50)
    manager_phone = models.CharField(max_length=20)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class InspectionItem(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=50, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class TaskTemplate(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    items = models.ManyToManyField(InspectionItem, related_name='templates')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_templates')
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class InspectionTask(models.Model):
    STATUS_CHOICES = (
        ('pending', '待执行'),
        ('executing', '执行中'),
        ('completed', '已完成'),
        ('reviewing', '待复核'),
        ('rejected', '需整改'),
        ('finished', '已结案'),
    )
    title = models.CharField(max_length=200)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='tasks')
    template = models.ForeignKey(TaskTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    items = models.ManyToManyField(InspectionItem, through='TaskItemResult')
    executor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='assigned_tasks')
    reviewer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='review_tasks')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_tasks')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    deadline = models.DateTimeField(null=True, blank=True)
    rectification_deadline_days = models.IntegerField(default=3)
    remark = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    executed_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.title

    @property
    def latest_reassignment(self):
        return self.reassignments.order_by('-created_at').first()

    @property
    def current_rectification_round(self):
        latest = self.rectifications.order_by('-round_number').first()
        return latest.round_number if latest else 0

    @property
    def rectification_status(self):
        if self.status not in ('rejected', 'reviewing'):
            return None
        if self.status == 'rejected':
            latest_rect = self.rectifications.filter(submitted_at__isnull=True).order_by('-round_number').first()
            if latest_rect and latest_rect.rectification_deadline:
                if timezone.now() > latest_rect.rectification_deadline:
                    return 'overdue'
            return 'rectifying'
        if self.status == 'reviewing':
            has_unreviewed = self.rectifications.filter(submitted_at__isnull=False).exists()
            if has_unreviewed:
                return 'pending_review'
        return None


class TaskReassignment(models.Model):
    task = models.ForeignKey(InspectionTask, on_delete=models.CASCADE, related_name='reassignments')
    original_executor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='reassigned_from')
    new_executor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='reassigned_to')
    reason = models.TextField()
    task_status_at_time = models.CharField(max_length=20)
    operator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='reassignments')
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.task.title} - 转派记录'


class TaskItemResult(models.Model):
    task = models.ForeignKey(InspectionTask, on_delete=models.CASCADE)
    item = models.ForeignKey(InspectionItem, on_delete=models.CASCADE)
    result = models.TextField(blank=True, null=True)
    photo_placeholder = models.TextField(blank=True, null=True)
    rectification_suggestion = models.TextField(blank=True, null=True)
    is_pass = models.BooleanField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('task', 'item')

    def __str__(self):
        return f'{self.task.title} - {self.item.name}'


class ReviewRecord(models.Model):
    task = models.ForeignKey(InspectionTask, on_delete=models.CASCADE, related_name='reviews')
    reviewer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    is_approved = models.BooleanField()
    comment = models.TextField(blank=True, null=True)
    rectification_deadline = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.task.title} - 复核记录'


class RectificationRecord(models.Model):
    task = models.ForeignKey(InspectionTask, on_delete=models.CASCADE, related_name='rectifications')
    round_number = models.IntegerField()
    review_record = models.ForeignKey(ReviewRecord, on_delete=models.CASCADE, related_name='rectifications')
    description = models.TextField(blank=True, null=True)
    rectification_deadline = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['round_number']

    def __str__(self):
        return f'{self.task.title} - 整改第{self.round_number}轮'

    @property
    def is_overdue(self):
        if self.submitted_at:
            return False
        if self.rectification_deadline and timezone.now() > self.rectification_deadline:
            return True
        return False


class SystemConfig(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.CharField(max_length=500)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.key}: {self.value}'
