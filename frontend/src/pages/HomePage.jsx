import { useEffect, useState } from 'react';
import { Alert, Layout, Pagination, Select, Skeleton, Space, Typography } from 'antd';

import ListingGrid from '../features/listings/ListingGrid';
import { fetchListings } from '../features/listings/listingApi';

const { Content } = Layout;

function HomePage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 12, total: 0 });
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    const loadListings = async () => {
      setLoading(true);
      try {
        const data = await fetchListings({ page, sort });
        setListings(data.items);
        setPagination(data.pagination);
        setError('');
      } catch {
        setError('Could not load listings. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadListings();
  }, [page, sort]);

  const updateSort = (nextSort) => {
    setSort(nextSort);
    setPage(1);
  };

  return (
    <Layout className="main-layout">
      <Content className="content-wrap">
        <section className="hero-section">
          <Typography.Title className="hero-title">
            Rent what you need, list what you own.
          </Typography.Title>
          <Typography.Paragraph className="hero-subtitle">
            A product-agnostic marketplace for tools, vehicles, fashion, and anything rentable.
          </Typography.Paragraph>
        </section>

        {error && (
          <Alert
            type="warning"
            message={error}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <section className="listing-toolbar">
          <Typography.Title level={4}>Available Listings</Typography.Title>
          <Space size="middle">
            <Typography.Text type="secondary">{pagination.total} available</Typography.Text>
            <Select
              aria-label="Sort listings"
              value={sort}
              onChange={updateSort}
              options={[
                { value: 'newest', label: 'Newest first' },
                { value: 'price_asc', label: 'Price: low to high' },
                { value: 'price_desc', label: 'Price: high to low' },
              ]}
            />
          </Space>
        </section>
        {loading ? <Skeleton active paragraph={{ rows: 6 }} /> : <ListingGrid items={listings} />}
        {pagination.total > pagination.pageSize && (
          <Pagination
            className="listing-pagination"
            current={page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            showSizeChanger={false}
            onChange={setPage}
          />
        )}
      </Content>
    </Layout>
  );
}

export default HomePage;
