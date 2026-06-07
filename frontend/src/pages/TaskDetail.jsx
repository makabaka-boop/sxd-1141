import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Descriptions, 
  Tag, 
  Button, 
  Space, 
  Card, 
  List, 
  Form, 
  Input, 
  Radio,
  message,
  Divider,
  Timeline,
  Typography,
  Row,
  Col,
  Avatar
} from 'antd';
import { 
  ArrowLeftOutlined, 
  UserOutlined,
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm();
  const { isExecutor, isReviewer, user } = useAuth();

  const statusMap = {
    pending: { color: 'default', text: '待执行' },
    executing: { color: 'processing', text: '执行中' },
    completed: { color: 'success', text: '已完成' },
    reviewing: { color: 'warning', text: '待复核' },
    rejected: { color: 'error', text: '需整改' },
    finished: { color: 'success', text: '已结案' },
  };

  const fetchTaskDetail = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/tasks/${id}/`);
      setTask(response.data);
      if (response.data.item_results) {
        const initialValues = {};
        response.data.item_results.forEach(item => {
          initialValues[`result_${item.id}`] = item.result;
          initialValues[`photo_${item.id}`] = item.photo_placeholder;
          initialValues[`suggestion_${item.id}`] = item.rectification_suggestion;
          initialValues[`pass_${item.id}`] = item.is_pass;
        });
        form.setFieldsValue(initialValues);
      }
    } catch (error) {
      message.error('获取任务详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetail();
  }, [id]);

  const handleSubmitResult = async () => {
    try {
      const values = await form.validateFields();
      const results = task.item_results.map(item => ({
        id: item.id,
        result: values[`result_${item.id}`],
        photo_placeholder: values[`photo_${item.id}`],
        rectification_suggestion: values[`suggestion_${item.id}`],
        is_pass: values[`pass_${item.id}`],
      }));
      
      setSubmitLoading(true);
      await api.post(`/tasks/${id}/submit_result/`, { results });
      message.success('提交成功');
      fetchTaskDetail();
    } catch (error) {
      message.error('提交失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  const canEditResult = () => {
    if (!isExecutor() || !task) return false;
    if (task.executor_detail?.id !== user?.id) return false;
    return ['executing', 'rejected'].includes(task.status);
  };

  if (!task) return <div>加载中...</div>;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate(-1)}
          style={{ marginBottom: 16 }}
        >
          返回
        </Button>
        <Title level={3} style={{ margin: 0 }}>{task.title}</Title>
      </div>

      <Row gutter={24}>
        <Col span={16}>
          <Card title="任务信息" style={{ marginBottom: 16 }}>
            <Descriptions column={2}>
              <Descriptions.Item label="门店">{task.store_detail?.name}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusMap[task.status]?.color}>
                  {statusMap[task.status]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="执行者">{task.executor_detail?.username}</Descriptions.Item>
              <Descriptions.Item label="复核者">{task.reviewer_detail?.username || '未指定'}</Descriptions.Item>
              <Descriptions.Item label="创建人">{task.created_by_detail?.username}</Descriptions.Item>
              <Descriptions.Item label="模板">{task.template_detail?.name || '无'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(task.created_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="截止时间">
                {task.deadline ? dayjs(task.deadline).format('YYYY-MM-DD HH:mm') : '无'}
              </Descriptions.Item>
              {task.remark && (
                <Descriptions.Item label="备注" span={2}>{task.remark}</Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          <Card title="巡检项目结果">
            <Form form={form} layout="vertical">
              {task.item_results?.map((item, index) => (
                <div key={item.id} style={{ marginBottom: 24, padding: 16, background: '#fafafa', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text strong style={{ fontSize: 15 }}>
                      {index + 1}. {item.item_detail?.name}
                    </Text>
                    {item.is_pass !== null && (
                      <Tag color={item.is_pass ? 'success' : 'error'}>
                        {item.is_pass ? '通过' : '不通过'}
                      </Tag>
                    )}
                  </div>
                  {item.item_detail?.description && (
                    <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                      {item.item_detail?.description}
                    </Text>
                  )}
                  
                  <Form.Item 
                    name={`pass_${item.id}`} 
                    label="是否通过"
                    rules={canEditResult() ? [{ required: true, message: '请选择是否通过' }] : []}
                  >
                    <Radio.Group disabled={!canEditResult()}>
                      <Radio value={true}>通过</Radio>
                      <Radio value={false}>不通过</Radio>
                    </Radio.Group>
                  </Form.Item>

                  <Form.Item 
                    name={`result_${item.id}`} 
                    label="巡检结果"
                    rules={canEditResult() ? [{ required: true, message: '请填写巡检结果' }] : []}
                  >
                    <TextArea 
                      rows={3} 
                      placeholder="请填写巡检结果描述" 
                      disabled={!canEditResult()}
                    />
                  </Form.Item>

                  <Form.Item name={`photo_${item.id}`} label="照片说明">
                    <TextArea 
                      rows={2} 
                      placeholder="请填写照片位置或说明（如：门店正门照片、消防栓照片等）" 
                      disabled={!canEditResult()}
                    />
                  </Form.Item>

                  <Form.Item name={`suggestion_${item.id}`} label="整改建议">
                    <TextArea 
                      rows={2} 
                      placeholder="如有问题，请填写整改建议" 
                      disabled={!canEditResult()}
                    />
                  </Form.Item>
                </div>
              ))}
            </Form>

            {canEditResult() && (
              <Button 
                type="primary" 
                icon={<SendOutlined />} 
                loading={submitLoading}
                onClick={handleSubmitResult}
                block
                size="large"
              >
                提交巡检结果
              </Button>
            )}
          </Card>
        </Col>

        <Col span={8}>
          <Card title="转派记录" style={{ marginBottom: 16 }}>
            {task.reassignments?.length > 0 ? (
              <Timeline
                items={task.reassignments.map((reassign, index) => ({
                  dot: <Avatar size="small" icon={<UserOutlined />} />,
                  children: (
                    <div>
                      <div style={{ fontWeight: 500 }}>
                        {reassign.original_executor_detail?.username} → {reassign.new_executor_detail?.username}
                      </div>
                      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                        原因：{reassign.reason}
                      </div>
                      <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                        操作人：{reassign.operator_detail?.username}
                      </div>
                      <div style={{ fontSize: 12, color: '#999' }}>
                        {dayjs(reassign.created_at).format('YYYY-MM-DD HH:mm')}
                      </div>
                      <div style={{ fontSize: 12, color: '#999' }}>
                        当时状态：{reassign.task_status_display}
                      </div>
                      {index < task.reassignments.length - 1 && <Divider style={{ margin: '12px 0' }} />}
                    </div>
                  ),
                }))}
              />
            ) : (
              <Text type="secondary">暂无转派记录</Text>
            )}
          </Card>

          <Card title="复核记录">
            {task.reviews?.length > 0 ? (
              <List
                dataSource={task.reviews}
                renderItem={(review) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        review.is_approved ? 
                          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 24 }} /> :
                          <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 24 }} />
                      }
                      title={
                        <Space>
                          <span>{review.is_approved ? '复核通过' : '需整改'}</span>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {review.reviewer_detail?.username}
                          </Text>
                        </Space>
                      }
                      description={
                        <div>
                          <div>{review.comment}</div>
                          <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                            {dayjs(review.created_at).format('YYYY-MM-DD HH:mm')}
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Text type="secondary">暂无复核记录</Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TaskDetail;
