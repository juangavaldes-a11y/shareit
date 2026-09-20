import { Card, Col, Empty, Row, Tag, Typography } from 'antd';

function ListingGrid({ items }) {
  if (!items.length) {
    return <Empty description="No listings yet" />;
  }

  return (
    <Row gutter={[16, 16]}>
      {items.map((item) => (
        <Col xs={24} sm={12} lg={8} key={item.id}>
          <Card title={item.title} bordered={false}>
            <Typography.Paragraph>
              {item.description || 'No description yet.'}
            </Typography.Paragraph>
            <Tag color="geekblue">{item.category}</Tag>
            <Tag color="green">${item.pricePerDay}/day</Tag>
            <Typography.Paragraph className="tool-meta">
              {item.location} • Owner: {item.owner?.fullName || 'N/A'}
            </Typography.Paragraph>
          </Card>
        </Col>
      ))}
    </Row>
  );
}

export default ListingGrid;
