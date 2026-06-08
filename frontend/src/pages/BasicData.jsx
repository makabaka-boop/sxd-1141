import { useState, useEffect } from 'react';
import { 
  Tabs, 
  Table, 
  Button, 
  Space, 
  Modal, 
  Form, 
  Input, 
  Select,
  InputNumber,
  message,
  Popconfirm,
  Switch,
  Tag,
  Typography
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../utils/api';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const BasicData = () => {
  const [activeTab, setActiveTab] = useState('stores');
  const [stores, setStores] = useState([]);
  const [inspectionItems, setInspectionItems] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [systemConfig, setSystemConfig] = useState({ default_rectification_deadline_days: 3 });
  
  const [storeModalVisible, setStoreModalVisible] = useState(false);
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  
  const [editingStore, setEditingStore] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  
  const [storeForm] = Form.useForm();
  const [itemForm] = Form.useForm();
  const [templateForm] = Form.useForm();
  const [configForm] = Form.useForm();

  const fetchStores = async () => {
    try {
      const response = await api.get('/stores/');
      setStores(response.data);
    } catch (error) {
      message.error('获取门店列表失败');
    }
  };

  const fetchInspectionItems = async () => {
    try {
      const response = await api.get('/inspection-items/');
      setInspectionItems(response.data);
      setAllItems(response.data);
    } catch (error) {
      message.error('获取巡检项目列表失败');
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/task-templates/');
      setTemplates(response.data);
    } catch (error) {
      message.error('获取任务模板列表失败');
    }
  };

  useEffect(() => {
    fetchStores();
    fetchInspectionItems();
    fetchTemplates();
  }, []);

  const handleSaveStore = async (values) => {
    try {
      if (editingStore) {
        await api.put(`/stores/${editingStore.id}/`, values);
        message.success('更新门店成功');
      } else {
        await api.post('/stores/', values);
        message.success('创建门店成功');
      }
      setStoreModalVisible(false);
      storeForm.resetFields();
      setEditingStore(null);
      fetchStores();
    } catch (error) {
      message.error('保存门店失败');
    }
  };

  const handleSaveItem = async (values) => {
    try {
      if (editingItem) {
        await api.put(`/inspection-items/${editingItem.id}/`, values);
        message.success('更新巡检项目成功');
      } else {
        await api.post('/inspection-items/', values);
        message.success('创建巡检项目成功');
      }
      setItemModalVisible(false);
      itemForm.resetFields();
      setEditingItem(null);
      fetchInspectionItems();
    } catch (error) {
      message.error('保存巡检项目失败');
    }
  };

  const handleSaveTemplate = async (values) => {
    try {
      if (editingTemplate) {
        await api.put(`/task-templates/${editingTemplate.id}/`, values);
        message.success('更新任务模板成功');
      } else {
        await api.post('/task-templates/', values);
        message.success('创建任务模板成功');
      }
      setTemplateModalVisible(false);
      templateForm.resetFields();
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error) {
      message.error('保存任务模板失败');
    }
  };

  const handleDeleteStore = async (id) => {
    try {
      await api.delete(`/stores/${id}/`);
      message.success('删除门店成功');
      fetchStores();
    } catch (error) {
      message.error('删除门店失败');
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      await api.delete(`/inspection-items/${id}/`);
      message.success('删除巡检项目成功');
      fetchInspectionItems();
    } catch (error) {
      message.error('删除巡检项目失败');
    }
  };

  const handleDeleteTemplate = async (id) => {
    try {
      await api.delete(`/task-templates/${id}/`);
      message.success('删除任务模板成功');
      fetchTemplates();
    } catch (error) {
      message.error('删除任务模板失败');
    }
  };

  const openEditStore = (store) => {
    setEditingStore(store);
    storeForm.setFieldsValue(store);
    setStoreModalVisible(true);
  };

  const openEditItem = (item) => {
    setEditingItem(item);
    itemForm.setFieldsValue(item);
    setItemModalVisible(true);
  };

  const openEditTemplate = (template) => {
    setEditingTemplate(template);
    templateForm.setFieldsValue({
      ...template,
      item_ids: template.items_detail?.map(i => i.id) || [],
    });
    setTemplateModalVisible(true);
  };

  const storeColumns = [
    {
      title: '门店名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: '店长',
      dataIndex: 'manager_name',
      key: 'manager_name',
    },
    {
      title: '联系电话',
      dataIndex: 'manager_phone',
      key: 'manager_phone',
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active) => (
        <Tag color={active ? 'success' : 'default'}>
          {active ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => openEditStore(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此门店？"
            onConfirm={() => handleDeleteStore(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const itemColumns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active) => (
        <Tag color={active ? 'success' : 'default'}>
          {active ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => openEditItem(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此巡检项目？"
            onConfirm={() => handleDeleteItem(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const templateColumns = [
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '巡检项目数',
      key: 'items_count',
      render: (_, record) => record.items_detail?.length || 0,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active) => (
        <Tag color={active ? 'success' : 'default'}>
          {active ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => openEditTemplate(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此任务模板？"
            onConfirm={() => handleDeleteTemplate(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'stores',
      label: '门店管理',
      children: (
        <div>
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => {
                setEditingStore(null);
                storeForm.resetFields();
                setStoreModalVisible(true);
              }}
            >
              新增门店
            </Button>
          </div>
          <Table columns={storeColumns} dataSource={stores} rowKey="id" />
        </div>
      ),
    },
    {
      key: 'items',
      label: '巡检项目',
      children: (
        <div>
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => {
                setEditingItem(null);
                itemForm.resetFields();
                setItemModalVisible(true);
              }}
            >
              新增巡检项目
            </Button>
          </div>
          <Table columns={itemColumns} dataSource={inspectionItems} rowKey="id" />
        </div>
      ),
    },
    {
      key: 'templates',
      label: '任务模板',
      children: (
        <div>
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => {
                setEditingTemplate(null);
                templateForm.resetFields();
                setTemplateModalVisible(true);
              }}
            >
              新增任务模板
            </Button>
          </div>
          <Table columns={templateColumns} dataSource={templates} rowKey="id" />
        </div>
      ),
    },
    {
      key: 'config',
      label: '系统配置',
      children: (
        <div>
          <Form form={configForm} layout="vertical" initialValues={systemConfig} onFinish={() => {
            const values = configForm.getFieldsValue();
            setSystemConfig(values);
            message.success('配置已保存');
          }}>
            <Form.Item name="default_rectification_deadline_days" label="默认整改时限(天)" rules={[{ required: true, message: '请输入整改时限' }]}>
              <InputNumber min={1} max={30} style={{ width: 200 }} placeholder="默认3天" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">保存配置</Button>
            </Form.Item>
          </Form>
          <div style={{ marginTop: 16, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
            <Typography.Text type="secondary">
              此配置将作为创建任务时的默认整改时限，复核人驳回任务后系统将据此自动计算整改截止时间。创建任务时仍可单独修改。
            </Typography.Text>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 16 }}>基础数据管理</Title>
      
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab} 
        items={tabItems} 
      />

      <Modal
        title={editingStore ? '编辑门店' : '新增门店'}
        open={storeModalVisible}
        onCancel={() => {
          setStoreModalVisible(false);
          storeForm.resetFields();
          setEditingStore(null);
        }}
        footer={null}
        width={600}
      >
        <Form form={storeForm} layout="vertical" onFinish={handleSaveStore}>
          <Form.Item name="name" label="门店名称" rules={[{ required: true }]}>
            <Input placeholder="请输入门店名称" />
          </Form.Item>
          <Form.Item name="address" label="门店地址" rules={[{ required: true }]}>
            <Input placeholder="请输入门店地址" />
          </Form.Item>
          <Form.Item name="manager_name" label="店长姓名" rules={[{ required: true }]}>
            <Input placeholder="请输入店长姓名" />
          </Form.Item>
          <Form.Item name="manager_phone" label="店长电话" rules={[{ required: true }]}>
            <Input placeholder="请输入店长电话" />
          </Form.Item>
          <Form.Item name="is_active" label="是否启用" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              {editingStore ? '更新' : '创建'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingItem ? '编辑巡检项目' : '新增巡检项目'}
        open={itemModalVisible}
        onCancel={() => {
          setItemModalVisible(false);
          itemForm.resetFields();
          setEditingItem(null);
        }}
        footer={null}
        width={600}
      >
        <Form form={itemForm} layout="vertical" onFinish={handleSaveItem}>
          <Form.Item name="name" label="项目名称" rules={[{ required: true }]}>
            <Input placeholder="请输入项目名称" />
          </Form.Item>
          <Form.Item name="description" label="项目描述">
            <TextArea rows={3} placeholder="请输入项目描述" />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Select placeholder="请选择分类">
              <Option value="安全">安全</Option>
              <Option value="卫生">卫生</Option>
              <Option value="运营">运营</Option>
              <Option value="服务">服务</Option>
            </Select>
          </Form.Item>
          <Form.Item name="is_active" label="是否启用" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              {editingItem ? '更新' : '创建'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingTemplate ? '编辑任务模板' : '新增任务模板'}
        open={templateModalVisible}
        onCancel={() => {
          setTemplateModalVisible(false);
          templateForm.resetFields();
          setEditingTemplate(null);
        }}
        footer={null}
        width={600}
      >
        <Form form={templateForm} layout="vertical" onFinish={handleSaveTemplate}>
          <Form.Item name="name" label="模板名称" rules={[{ required: true }]}>
            <Input placeholder="请输入模板名称" />
          </Form.Item>
          <Form.Item name="description" label="模板描述">
            <TextArea rows={3} placeholder="请输入模板描述" />
          </Form.Item>
          <Form.Item name="item_ids" label="选择巡检项目" rules={[{ required: true }]}>
            <Select mode="multiple" placeholder="请选择巡检项目" style={{ width: '100%' }}>
              {allItems.map(item => (
                <Option key={item.id} value={item.id}>{item.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="is_active" label="是否启用" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              {editingTemplate ? '更新' : '创建'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BasicData;
