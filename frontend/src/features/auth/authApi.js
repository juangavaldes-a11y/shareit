import apiClient from '../../services/apiClient';

export const registerUser = async (payload) => {
  const response = await apiClient.post('/auth/register', payload);
  return response.data;
};

export const loginUser = async (payload) => {
  const response = await apiClient.post('/auth/login', payload);
  return response.data;
};

export const logoutUser = async () => {
  await apiClient.post('/auth/logout');
};

export const fetchMe = async () => {
  const response = await apiClient.get('/auth/me');
  return response.data;
};
