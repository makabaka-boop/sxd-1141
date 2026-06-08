import { useState, useEffect } from 'react';
import {
  Table,
  Tag,
  Button,
  Select,
  Typography
} from 'antd';
import { EyeOutlined, WarningOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../utils/api';

const { Title } = Typography;
const { Option } = Select;

const RectificationList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rectificationStatusFilter, setRectificationStatusFilter] = useState();
  const navigate = useNavigate();

  const rectificationStatusMap = {
    rectifying: { color: 'processing', text: '整改中' },
    pending_review: { color: 'warning', text: '待复核' },
    overdue: { color: 'error', text: '已超期' },
  };

  const taskStatusMap = {
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
      const params = { has_rectification: 'true' };
      if (rectificationStatusFilter) {
        params.rectification_status = rectificationStatusFilter;
      }
      const response = await api.get('/tasks/', { params });
      setTasks(response.data);
    } catch (error) {
      console.error('获取整改任务列表失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [rectificationStatusFilter]);

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
      title: '任务状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const info = taskStatusMap[status] || { color: 'default', text: status };
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
      title: '最近整改提交',
      dataIndex: 'latest_rectification_submitted_at',
      key: 'submitted_at',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : <span style={{ color: '#999' }}>未提交</span>,
    },
    {
      title: '超期标记',
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
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/tasks/${record.id}`)}
        >
          查看详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>整改跟踪</Title>
      </div>

      <div style={{ marginBottom: 16 }}>
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
      </div>

      <Table
        columns={columns}
        dataSource={tasks}
        rowKey="id"
        loading={loading}
      />
    </div>
  );
};

export default RectificationList;
