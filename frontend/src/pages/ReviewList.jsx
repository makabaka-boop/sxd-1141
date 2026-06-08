import { useState, useEffect } from 'react';
import { 
  Table, 
  Tag, 
  Button, 
  Space, 
  Typography, 
  Modal, 
  Form, 
  Input, 
  DatePicker,
  message,
  Radio,
  Tabs,
  Select
} from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, EyeOutlined, WarningOutlined, BellOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const ReviewList = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [rectificationStatusFilter, setRectificationStatusFilter] = useState();
  const [reminderStatusFilter, setReminderStatusFilter] = useState();
  const [pendingReminderStatusFilter, setPendingReminderStatusFilter] = useState();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { user } = useAuth();

  const statusMap = {
    reviewing: { color: 'warning', text: '待复核' },
    rejected: { color: 'error', text: '需整改' },
    finished: { color: 'success', text: '已结案' },
  };

  const rectificationStatusMap = {
    rectifying: { color: 'processing', text: '整改中' },
    pending_review: { color: 'warning', text: '待复核' },
    overdue: { color: 'error', text: '已超期' },
  };

  const reminderStatusMap = {
    no_reminder: { color: 'default', text: '未催办' },
    unresponded: { color: 'warning', text: '已催办未响应' },
    responded: { color: 'success', text: '已响应' },
  };

  const fetchPendingTasks = async () => {
    setLoading(true);
    try {
      const params = { status: 'reviewing' };
      if (pendingReminderStatusFilter) {
        params.reminder_status = pendingReminderStatusFilter;
      }
      const response = await api.get('/tasks/', { params });
      setTasks(response.data);
    } catch (error) {
      message.error('获取任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchRectificationTasks = async () => {
    setLoading(true);
    try {
      const params = { has_rectification: 'true' };
      if (rectificationStatusFilter) {
        params.rectification_status = rectificationStatusFilter;
      }
      if (reminderStatusFilter) {
        params.reminder_status = reminderStatusFilter;
      }
      const response = await api.get('/tasks/', { params });
      setTasks(response.data);
    } catch (error) {
      message.error('获取整改任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchPendingTasks();
    } else {
      fetchRectificationTasks();
    }
  }, [activeTab, rectificationStatusFilter, reminderStatusFilter, pendingReminderStatusFilter]);

  const handleReview = async (values) => {
    try {
      const data = {
        ...values,
        rectification_deadline: values.rectification_deadline ? values.rectification_deadline.format() : null,
      };
      await api.post(`/tasks/${selectedTask.id}/review/`, data);
      message.success('复核成功');
      setReviewModalVisible(false);
      form.resetFields();
      setSelectedTask(null);
      if (activeTab === 'pending') {
        fetchPendingTasks();
      } else {
        fetchRectificationTasks();
      }
    } catch (error) {
      message.error('复核失败');
    }
  };

  const pendingColumns = [
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
      title: '催办次数',
      dataIndex: 'reminder_count',
      key: 'reminder_count',
      render: (count) => count > 0 ? (
        <Tag color="#eb2f96" icon={<BellOutlined />}>{count}次</Tag>
      ) : <span style={{ color: '#999' }}>0</span>,
    },
    {
      title: '催办响应',
      dataIndex: 'reminder_response_status',
      key: 'reminder_response_status',
      render: (status) => {
        if (!status) return <span style={{ color: '#999' }}>-</span>;
        const info = reminderStatusMap[status] || { color: 'default', text: status };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '提交时间',
      dataIndex: 'executed_at',
      key: 'executed_at',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
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
            查看详情
          </Button>
          <Button 
            type="primary" 
            size="small"
            onClick={() => {
              setSelectedTask(record);
              setReviewModalVisible(true);
            }}
          >
            复核
          </Button>
        </Space>
      ),
    },
  ];

  const rectificationColumns = [
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
      title: '任务状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const info = statusMap[status] || { color: 'default', text: status };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '整改状态',
      dataIndex: 'rectification_status',
      key: 'rectification_status',
      render: (status) => {
        if (!status) return <span style={{ color: '#999' }}>-</span>;
        const info = rectificationStatusMap[status] || { color: 'default', text: status };
        return <Tag color={info.color} icon={status === 'overdue' ? <WarningOutlined /> : null}>{info.text}</Tag>;
      },
    },
    {
      title: '整改轮次',
      dataIndex: 'current_rectification_round',
      key: 'round',
      render: (round) => round ? `第${round}轮` : '-',
    },
    {
      title: '催办次数',
      dataIndex: 'reminder_count',
      key: 'reminder_count',
      render: (count) => count > 0 ? (
        <Tag color="#eb2f96" icon={<BellOutlined />}>{count}次</Tag>
      ) : <span style={{ color: '#999' }}>0</span>,
    },
    {
      title: '最近催办',
      dataIndex: 'latest_reminder_at',
      key: 'latest_reminder_at',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: '催办响应',
      dataIndex: 'reminder_response_status',
      key: 'reminder_response_status',
      render: (status) => {
        if (!status) return <span style={{ color: '#999' }}>-</span>;
        const info = reminderStatusMap[status] || { color: 'default', text: status };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '最近整改提交',
      dataIndex: 'latest_rectification_submitted_at',
      key: 'submitted_at',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : <span style={{ color: '#999' }}>未提交</span>,
    },
    {
      title: '超期',
      dataIndex: 'latest_rectification_is_overdue',
      key: 'is_overdue',
      render: (overdue) => overdue
        ? <Tag color="error" icon={<WarningOutlined />}>已超期</Tag>
        : <Tag color="success">未超期</Tag>,
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
            查看详情
          </Button>
          {record.status === 'reviewing' && (
            <Button 
              type="primary" 
              size="small"
              onClick={() => {
                setSelectedTask(record);
                setReviewModalVisible(true);
              }}
            >
              复核
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'pending',
      label: '待复核任务',
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Select
              placeholder="筛选催办响应状态"
              style={{ width: 200 }}
              allowClear
              value={pendingReminderStatusFilter}
              onChange={setPendingReminderStatusFilter}
            >
              {Object.entries(reminderStatusMap).map(([key, value]) => (
                <Option key={key} value={key}>{value.text}</Option>
              ))}
            </Select>
          </div>
          <Table 
            columns={pendingColumns} 
            dataSource={tasks} 
            rowKey="id" 
            loading={loading}
          />
        </div>
      ),
    },
    {
      key: 'rectification',
      label: '整改任务视图',
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Select
                placeholder="筛选整改状态"
                style={{ width: 200 }}
                allowClear
                value={rectificationStatusFilter}
                onChange={setRectificationStatusFilter}
              >
                {Object.entries(rectificationStatusMap).map(([key, value]) => (
                  <Option key={key} value={key}>{value.text}</Option>
                ))}
              </Select>
              <Select
                placeholder="筛选催办响应状态"
                style={{ width: 200 }}
                allowClear
                value={reminderStatusFilter}
                onChange={setReminderStatusFilter}
              >
                {Object.entries(reminderStatusMap).map(([key, value]) => (
                  <Option key={key} value={key}>{value.text}</Option>
                ))}
              </Select>
            </Space>
          </div>
          <Table 
            columns={rectificationColumns} 
            dataSource={tasks} 
            rowKey="id" 
            loading={loading}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 16 }}>复核任务</Title>
      
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      <Modal
        title="任务复核"
        open={reviewModalVisible}
        onCancel={() => {
          setReviewModalVisible(false);
          form.resetFields();
          setSelectedTask(null);
        }}
        footer={null}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <p><strong>任务：</strong>{selectedTask?.title}</p>
          <p><strong>门店：</strong>{selectedTask?.store_name}</p>
          <p><strong>执行者：</strong>{selectedTask?.executor_detail?.username}</p>
          {selectedTask?.current_rectification_round > 0 && (
            <p><strong>整改轮次：</strong>第{selectedTask.current_rectification_round}轮</p>
          )}
        </div>
        
        <Form form={form} layout="vertical" onFinish={handleReview}>
          <Form.Item 
            name="is_approved" 
            label="复核结果" 
            rules={[{ required: true, message: '请选择复核结果' }]}
          >
            <Radio.Group>
              <Radio value={true}>
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  通过
                </Space>
              </Radio>
              <Radio value={false}>
                <Space>
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                  需整改
                </Space>
              </Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item 
            name="comment" 
            label="复核意见" 
            rules={[{ required: true, message: '请填写复核意见' }]}
          >
            <TextArea rows={4} placeholder="请填写复核意见" />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.is_approved !== curr.is_approved}>
            {({ getFieldValue }) => {
              const isApproved = getFieldValue('is_approved');
              if (isApproved === false) {
                return (
                  <Form.Item name="rectification_deadline" label="整改截止时间">
                    <DatePicker showTime style={{ width: '100%' }} />
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>提交复核</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ReviewList;
