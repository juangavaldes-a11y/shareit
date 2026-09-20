import { useEffect, useState } from 'react';
import { Alert, Button, Layout, Modal, Space, Switch, Table, Tag, Typography } from 'antd';
import { fetchModules, updateModule } from '../features/admin/adminApi';
import useModules from '../features/modules/useModules';
import ModuleAuditLog from '../features/admin/ModuleAuditLog';

const { Content } = Layout;

function AdminModulesPage() {
  const [modules, setModules] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState('');
  const { refresh } = useModules();

  const loadModules = async () => {
    setLoading(true);
    try {
      setModules(await fetchModules());
      setError('');
    } catch {
      setError('Unable to load module settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModules();
  }, []);

  const changeModuleState = (module, enabled) => {
    Modal.confirm({
      title: `${enabled ? 'Enable' : 'Disable'} ${module.name}?`,
      content: enabled
        ? 'This makes the feature available immediately.'
        : 'This blocks the feature for all users immediately.',
      okText: enabled ? 'Enable' : 'Disable',
      okButtonProps: enabled ? undefined : { danger: true },
      onOk: async () => {
        setUpdatingKey(module.key);
        try {
          const updatedModule = await updateModule(module.key, enabled);
          setModules((currentModules) => currentModules.map((currentModule) => (
            currentModule.key === updatedModule.key ? updatedModule : currentModule
          )));
          await refresh();
        } catch (requestError) {
          setError(requestError.response?.data?.message || 'Unable to update module settings.');
        } finally {
          setUpdatingKey('');
        }
      },
    });
  };

  const columns = [
    {
      title: 'Module',
      dataIndex: 'name',
      key: 'name',
      render: (name, module) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{name}</Typography.Text>
          <Typography.Text type="secondary">{module.description}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, module) => (
        <Tag color={module.enabled ? 'green' : 'default'}>
          {module.enabled ? 'Enabled' : 'Disabled'}
        </Tag>
      ),
    },
    {
      title: 'Availability',
      key: 'availability',
      render: (_, module) => (
        module.isCore ? <Typography.Text type="secondary">Required</Typography.Text> : (
          <Switch
            checked={module.enabled}
            disabled={updatingKey === module.key}
            onChange={(enabled) => changeModuleState(module, enabled)}
          />
        )
      ),
    },
  ];

  return (
    <Layout className="main-layout">
      <Content className="content-wrap">
        <section className="admin-heading">
          <Typography.Title level={2}>Modules</Typography.Title>
          <Typography.Paragraph>
            Control which product capabilities are available across the platform.
          </Typography.Paragraph>
        </section>
        {error && <Alert type="error" message={error} showIcon closable onClose={() => setError('')} />}
        <Table
          className="module-table"
          columns={columns}
          dataSource={modules}
          rowKey="key"
          loading={loading}
          pagination={false}
          expandable={{
            expandedRowRender: (module) => <ModuleAuditLog moduleKey={module.key} />,
            rowExpandable: (module) => !module.isCore,
          }}
        />
        <Button type="link" onClick={loadModules}>Refresh settings</Button>
      </Content>
    </Layout>
  );
}

export default AdminModulesPage;