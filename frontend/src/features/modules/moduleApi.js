import apiClient from '../../services/apiClient';

export const fetchCapabilities = async () => {
  const response = await apiClient.get('/modules');
  return response.data.enabledModules;
};