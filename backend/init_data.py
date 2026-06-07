#!/usr/bin/env python3
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'inspection_platform.settings')
django.setup()

from django.contrib.auth.models import User
from core.models import Store, InspectionItem, TaskTemplate


def create_user(username, password, role, email=''):
    try:
        user = User.objects.get(username=username)
        print(f'用户 {username} 已存在')
    except User.DoesNotExist:
        user = User.objects.create_user(
            username=username,
            password=password,
            email=email
        )
        user.profile.role = role
        user.profile.save()
        print(f'创建用户: {username} ({role})')
    return user


def create_stores():
    stores_data = [
        {'name': '中关村店', 'address': '北京市海淀区中关村大街1号', 'manager_name': '张三', 'manager_phone': '13800138001'},
        {'name': '王府井店', 'address': '北京市东城区王府井大街88号', 'manager_name': '李四', 'manager_phone': '13800138002'},
        {'name': '国贸店', 'address': '北京市朝阳区建国门外大街1号', 'manager_name': '王五', 'manager_phone': '13800138003'},
        {'name': '西单店', 'address': '北京市西城区西单北大街120号', 'manager_name': '赵六', 'manager_phone': '13800138004'},
        {'name': '三里屯店', 'address': '北京市朝阳区三里屯路19号', 'manager_name': '钱七', 'manager_phone': '13800138005'},
    ]
    
    for data in stores_data:
        store, created = Store.objects.get_or_create(
            name=data['name'],
            defaults=data
        )
        if created:
            print(f'创建门店: {data["name"]}')
        else:
            print(f'门店 {data["name"]} 已存在')


def create_inspection_items():
    items_data = [
        {'name': '消防设备检查', 'description': '检查灭火器、消防栓等消防设备是否完好有效', 'category': '安全'},
        {'name': '电气安全检查', 'description': '检查电线、插座、开关等是否有安全隐患', 'category': '安全'},
        {'name': '卫生环境检查', 'description': '检查门店整体卫生状况', 'category': '卫生'},
        {'name': '商品陈列检查', 'description': '检查商品陈列是否规范、整洁', 'category': '运营'},
        {'name': '员工仪容仪表', 'description': '检查员工着装、仪容仪表是否符合规范', 'category': '运营'},
        {'name': '服务态度检查', 'description': '检查员工服务态度是否热情周到', 'category': '服务'},
        {'name': '库存管理检查', 'description': '检查库存管理是否规范，有无过期商品', 'category': '运营'},
        {'name': '价格标识检查', 'description': '检查商品价格标识是否清晰准确', 'category': '运营'},
    ]
    
    for data in items_data:
        item, created = InspectionItem.objects.get_or_create(
            name=data['name'],
            defaults=data
        )
        if created:
            print(f'创建巡检项目: {data["name"]}')
        else:
            print(f'巡检项目 {data["name"]} 已存在')


def create_task_templates(manager):
    templates_data = [
        {
            'name': '日常巡检模板',
            'description': '门店日常巡检标准模板',
            'items': ['消防设备检查', '电气安全检查', '卫生环境检查', '商品陈列检查', '员工仪容仪表']
        },
        {
            'name': '月度全面巡检模板',
            'description': '门店月度全面巡检模板',
            'items': ['消防设备检查', '电气安全检查', '卫生环境检查', '商品陈列检查', 
                     '员工仪容仪表', '服务态度检查', '库存管理检查', '价格标识检查']
        },
    ]
    
    for data in templates_data:
        template, created = TaskTemplate.objects.get_or_create(
            name=data['name'],
            defaults={
                'description': data['description'],
                'created_by': manager
            }
        )
        if created:
            item_names = data['items']
            items = InspectionItem.objects.filter(name__in=item_names)
            template.items.set(items)
            print(f'创建任务模板: {data["name"]}')
        else:
            print(f'任务模板 {data["name"]} 已存在')


if __name__ == '__main__':
    print('开始初始化数据...')
    
    # 创建用户
    manager = create_user('manager', 'manager123', 'manager', 'manager@example.com')
    create_user('executor1', 'executor123', 'executor', 'executor1@example.com')
    create_user('executor2', 'executor123', 'executor', 'executor2@example.com')
    create_user('reviewer1', 'reviewer123', 'reviewer', 'reviewer1@example.com')
    create_user('reviewer2', 'reviewer123', 'reviewer', 'reviewer2@example.com')
    
    # 创建基础数据
    create_stores()
    create_inspection_items()
    create_task_templates(manager)
    
    print('数据初始化完成!')
    print('')
    print('测试账号:')
    print('  管理者: manager / manager123')
    print('  执行者: executor1 / executor123')
    print('  执行者: executor2 / executor123')
    print('  复核者: reviewer1 / reviewer123')
    print('  复核者: reviewer2 / reviewer123')
