import { Button, Layout, Space, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';
import useModules from '../features/modules/useModules';

const { Header } = Layout;

function AppHeader() {
  const { user, logout } = useAuth();
  const { isEnabled } = useModules();

  return (
    <Header className="app-header">
      <Typography.Title level={3} className="brand-title">
        ShareIt
      </Typography.Title>
      <Space size="middle">
        <Link to="/"><Button type="text">Home</Button></Link>
        {isEnabled('listings') && <Button type="primary">List an Item</Button>}
        {user?.role === 'admin' && <Link to="/admin/modules"><Button type="text">Administration</Button></Link>}
        {user && <Button type="text" onClick={logout}>Sign out</Button>}
        {!user && <Link to="/auth"><Button type="text">Sign in</Button></Link>}
      </Space>
    </Header>
  );
}

export default AppHeader;
