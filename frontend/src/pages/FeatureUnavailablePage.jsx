import { Button, Layout, Result } from 'antd';
import { Link } from 'react-router-dom';

const { Content } = Layout;

function FeatureUnavailablePage() {
  return (
    <Layout className="main-layout">
      <Content className="content-wrap">
        <Result
          status="warning"
          title="This feature is currently unavailable"
          subTitle="An administrator has temporarily disabled it."
          extra={<Link to="/"><Button type="primary">Return home</Button></Link>}
        />
      </Content>
    </Layout>
  );
}

export default FeatureUnavailablePage;