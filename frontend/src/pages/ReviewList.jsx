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
  Radio
} from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const { Title } = Typography;
const { TextArea } = Input;

const ReviewList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { user } = useAuth();

  const statusMap = {
    reviewing: { color: 'warning', text: '待复核' },
    rejected: { color: 'error', text: '需整改' },
    finished: { color: 'success', text: '已结案' },
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await api.get('/tasks/', { params: { status: 'reviewing' } });
      setTasks(response.data);
    } catch (error) {
      message.error('获取任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

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
      fetchTasks();
    } catch (error) {
      message.error('复核失败');
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

  return (
    <div>
      <Title level={3} style={{ marginBottom: 16 }}>待复核任务</Title>
      
      <Table 
        columns={columns} 
        dataSource={tasks} 
        rowKey="id" 
        loading={loading}
      />

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
