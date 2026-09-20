import apiClient from '../../services/apiClient';

export const fetchModules = async () => {
  const response = await apiClient.get('/admin/modules');
  return response.data;
};

export const updateModule = async (key, enabled) => {
  const response = await apiClient.patch(`/admin/modules/${key}`, { enabled });
  return response.data;
};

export const fetchModuleAuditLogs = async (key) => {
  const response = await apiClient.get(`/admin/modules/${key}/audit-logs`);
  return response.data;
};