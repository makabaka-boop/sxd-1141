import { Layout, Menu, Avatar, Dropdown, Space, Typography } from 'antd';
import { 
  UserOutlined, 
  LogoutOutlined, 
  UnorderedListOutlined, 
  DatabaseOutlined,
  CheckCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const AppLayout = ({ children }) => {
  const { user, logout, isManager, isReviewer } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  const getMenuItems = () => {
    const items = [
      {
        key: '/tasks',
        icon: <UnorderedListOutlined />,
        label: '任务列表',
        onClick: () => navigate('/tasks'),
      },
    ];

    items.push({
      key: '/rectifications',
      icon: <WarningOutlined />,
      label: '整改跟踪',
      onClick: () => navigate('/rectifications'),
    });

    if (isReviewer()) {
      items.push({
        key: '/reviews',
        icon: <CheckCircleOutlined />,
        label: '复核任务',
        onClick: () => navigate('/reviews'),
      });
    }

    if (isManager()) {
      items.push({
        key: '/basic-data',
        icon: <DatabaseOutlined />,
        label: '基础数据',
        onClick: () => navigate('/basic-data'),
      });
    }

    return items;
  };

  const getRoleName = (role) => {
    const roleMap = {
      manager: '管理者',
      executor: '执行者',
      reviewer: '复核者',
    };
    return roleMap[role] || role;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={220}>
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.1)'
        }}>
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            门店巡检平台
          </Title>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={getMenuItems()}
        />
      </Sider>
      <Layout>
        <Header style={{ 
          background: '#fff', 
          padding: '0 24px', 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,21,41,0.08)'
        }}>
          <div></div>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <span>
                {user?.username} ({getRoleName(user?.role)})
              </span>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: '24px', background: '#fff', padding: 24, minHeight: 280 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
