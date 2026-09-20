import { useEffect, useState } from 'react';
import { Alert, List, Spin, Tag, Typography } from 'antd';
import { fetchModuleAuditLogs } from './adminApi';

function ModuleAuditLog({ moduleKey }) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAuditLogs = async () => {
      try {
        setAuditLogs(await fetchModuleAuditLogs(moduleKey));
      } catch {
        setError('Unable to load change history.');
      } finally {
        setLoading(false);
      }
    };

    loadAuditLogs();
  }, [moduleKey]);

  if (loading) {
    return <Spin size="small" />;
  }

  if (error) {
    return <Alert type="error" message={error} showIcon />;
  }

  if (!auditLogs.length) {
    return <Typography.Text type="secondary">No changes have been recorded.</Typography.Text>;
  }

  return (
    <List
      size="small"
      dataSource={auditLogs}
      renderItem={(entry) => (
        <List.Item>
          <Typography.Text>
            {entry.actor.fullName} changed this module to{' '}
            <Tag color={entry.enabled ? 'green' : 'default'}>{entry.enabled ? 'Enabled' : 'Disabled'}</Tag>
          </Typography.Text>
          <Typography.Text type="secondary">{new Date(entry.createdAt).toLocaleString()}</Typography.Text>
        </List.Item>
      )}
    />
  );
}

export default ModuleAuditLog;