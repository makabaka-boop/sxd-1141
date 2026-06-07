import { useState, useEffect } from 'react';
import { 
  Table, 
  Tag, 
  Button, 
  Space, 
  Select, 
  Typography, 
  Modal, 
  Form, 
  Input, 
  DatePicker,
  message,
  Popconfirm,
  Row,
  Col
} from 'antd';
import { 
  PlusOutlined, 
  EyeOutlined, 
  SwapOutlined,
  PlayCircleOutlined,
  SendOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [reassignModalVisible, setReassignModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [stores, setStores] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [executors, setExecutors] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [form] = Form.useForm();
  const [batchForm] = Form.useForm();
  const [reassignForm] = Form.useForm();
  
  const navigate = useNavigate();
  const { isManager, isExecutor, user } = useAuth();

  const statusMap = {
    pending: { color: 'default', text: '待执行' },
    executing: { color: 'processing', text: '执行中' },
    completed: { color: 'success', text: '已完成' },
    reviewing: { color: 'warning', text: '待复核' },
    rejected: { color: 'error', text: '需整改' },
    finished: { color: 'success', text: '已结案' },
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const response = await api.get('/tasks/', { params });
      setTasks(response.data);
    } catch (error) {
      message.error('获取任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [storesRes, templatesRes, executorsRes, reviewersRes] = await Promise.all([
        api.get('/stores/'),
        api.get('/task-templates/'),
        api.get('/users/executors/'),
        api.get('/users/reviewers/'),
      ]);
      setStores(storesRes.data);
      setTemplates(templatesRes.data);
      setExecutors(executorsRes.data);
      setReviewers(reviewersRes.data);
    } catch (error) {
      console.error('获取选项数据失败', error);
    }
  };

  useEffect(() => {
    fetchTasks();
    if (isManager()) {
      fetchOptions();
    }
  }, [statusFilter]);

  const handleCreateTask = async (values) => {
    try {
      const data = {
        ...values,
        deadline: values.deadline ? values.deadline.format() : null,
      };
      await api.post('/tasks/', data);
      message.success('创建任务成功');
      setCreateModalVisible(false);
      form.resetFields();
      fetchTasks();
    } catch (error) {
      message.error('创建任务失败');
    }
  };

  const handleBatchCreate = async (values) => {
    try {
      const data = {
        ...values,
        deadline: values.deadline ? values.deadline.format() : null,
      };
      await api.post('/tasks/batch_create/', data);
      message.success('批量创建任务成功');
      setBatchModalVisible(false);
      batchForm.resetFields();
      fetchTasks();
    } catch (error) {
      message.error('批量创建任务失败');
    }
  };

  const handleReassign = async (values) => {
    try {
      await api.post(`/tasks/${selectedTask.id}/reassign/`, values);
      message.success('转派成功');
      setReassignModalVisible(false);
      reassignForm.resetFields();
      setSelectedTask(null);
      fetchTasks();
    } catch (error) {
      message.error('转派失败');
    }
  };

  const handleStartExecution = async (taskId) => {
    try {
      await api.post(`/tasks/${taskId}/start_execution/`);
      message.success('开始执行');
      fetchTasks();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns = [
    {
      title: '任务标题',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <a onClick={() => navigate(`/tasks/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: '门店',
      dataIndex: 'store_name',
      key: 'store_name',
    },
    {
      title: '执行者',
      dataIndex: ['executor_detail', 'username'],
      key: 'executor',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const info = statusMap[status] || { color: 'default', text: status };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '最新转派',
      dataIndex: 'latest_reassignment_summary',
      key: 'reassignment',
      render: (summary) => {
        if (!summary) return <span style={{ color: '#999' }}>无</span>;
        return (
          <div>
            <div style={{ fontSize: 12 }}>
              {summary.original_executor} → {summary.new_executor}
            </div>
            <div style={{ fontSize: 11, color: '#999' }}>
              {dayjs(summary.created_at).format('MM-DD HH:mm')}
            </div>
          </div>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="link" 
            icon={<EyeOutlined />} 
            onClick={() => navigate(`/tasks/${record.id}`)}
          >
            详情
          </Button>
          {isExecutor() && record.executor_detail?.id === user?.id && record.status === 'pending' && (
            <Button 
              type="link" 
              icon={<PlayCircleOutlined />}
              onClick={() => handleStartExecution(record.id)}
            >
              开始执行
            </Button>
          )}
          {isExecutor() && record.executor_detail?.id === user?.id && ['executing', 'rejected'].includes(record.status) && (
            <Button 
              type="link" 
              icon={<SendOutlined />}
              onClick={() => navigate(`/tasks/${record.id}`)}
            >
              填写结果
            </Button>
          )}
          {isManager() && (
            <Popconfirm
              title="确定转派此任务？"
              onConfirm={() => {
                setSelectedTask(record);
                setReassignModalVisible(true);
              }}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" icon={<SwapOutlined />}>转派</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>任务列表</Title>
        {isManager() && (
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => setCreateModalVisible(true)}
            >
              新建任务
            </Button>
            <Button 
              icon={<PlusOutlined />} 
              onClick={() => setBatchModalVisible(true)}
            >
              批量创建
            </Button>
          </Space>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <Select
          placeholder="筛选状态"
          style={{ width: 200 }}
          allowClear
          value={statusFilter}
          onChange={setStatusFilter}
        >
          {Object.entries(statusMap).map(([key, value]) => (
            <Option key={key} value={key}>{value.text}</Option>
          ))}
        </Select>
      </div>

      <Table 
        columns={columns} 
        dataSource={tasks} 
        rowKey="id" 
        loading={loading}
      />

      <Modal
        title="新建任务"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateTask}>
          <Form.Item name="title" label="任务标题" rules={[{ required: true }]}>
            <Input placeholder="请输入任务标题" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="store" label="门店" rules={[{ required: true }]}>
                <Select placeholder="请选择门店">
                  {stores.map(store => (
                    <Option key={store.id} value={store.id}>{store.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="template" label="任务模板">
                <Select placeholder="请选择模板">
                  {templates.map(tpl => (
                    <Option key={tpl.id} value={tpl.id}>{tpl.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="executor" label="执行者" rules={[{ required: true }]}>
                <Select placeholder="请选择执行者">
                  {executors.map(exec => (
                    <Option key={exec.id} value={exec.id}>{exec.username}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="reviewer" label="复核者">
                <Select placeholder="请选择复核者">
                  {reviewers.map(rev => (
                    <Option key={rev.id} value={rev.id}>{rev.username}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="deadline" label="截止时间">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>创建</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="批量创建任务"
        open={batchModalVisible}
        onCancel={() => {
          setBatchModalVisible(false);
          batchForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={batchForm} layout="vertical" onFinish={handleBatchCreate}>
          <Form.Item name="title_prefix" label="任务标题前缀" rules={[{ required: true }]}>
            <Input placeholder="如：6月日常巡检" />
          </Form.Item>
          <Form.Item name="store_ids" label="选择门店" rules={[{ required: true }]}>
            <Select mode="multiple" placeholder="请选择门店" style={{ width: '100%' }}>
              {stores.map(store => (
                <Option key={store.id} value={store.id}>{store.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="template_id" label="任务模板" rules={[{ required: true }]}>
            <Select placeholder="请选择模板">
              {templates.map(tpl => (
                <Option key={tpl.id} value={tpl.id}>{tpl.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="executor_id" label="执行者" rules={[{ required: true }]}>
                <Select placeholder="请选择执行者">
                  {executors.map(exec => (
                    <Option key={exec.id} value={exec.id}>{exec.username}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="reviewer_id" label="复核者">
                <Select placeholder="请选择复核者">
                  {reviewers.map(rev => (
                    <Option key={rev.id} value={rev.id}>{rev.username}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="deadline" label="截止时间">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>批量创建</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="转派任务"
        open={reassignModalVisible}
        onCancel={() => {
          setReassignModalVisible(false);
          reassignForm.resetFields();
          setSelectedTask(null);
        }}
        footer={null}
      >
        <Form form={reassignForm} layout="vertical" onFinish={handleReassign}>
          <Form.Item name="new_executor_id" label="新执行者" rules={[{ required: true }]}>
            <Select placeholder="请选择新执行者">
              {executors.map(exec => (
                <Option key={exec.id} value={exec.id}>{exec.username}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="reason" label="转派原因" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="请输入转派原因" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>确认转派</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TaskList;
