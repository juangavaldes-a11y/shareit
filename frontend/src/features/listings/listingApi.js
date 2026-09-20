import apiClient from '../../services/apiClient';

export const fetchListings = async ({ page = 1, pageSize = 12, sort = 'newest' } = {}) => {
  const response = await apiClient.get('/listings', {
    params: { page, pageSize, sort },
  });
  return response.data;
};
