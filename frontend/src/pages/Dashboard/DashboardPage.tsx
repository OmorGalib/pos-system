import React from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Typography,
  Tag,
  Space,
  Progress,
} from 'antd';
import {
  ShoppingCartOutlined,
  DollarOutlined,
  ProductOutlined,
  WarningOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { salesAPI, productsAPI, Product } from '../../api/endpoints';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const formatNumber = (
  value: number | string,
  currency = false
) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return '0';

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: currency ? 2 : 0,
    maximumFractionDigits: currency ? 2 : 0,
  }).format(num);
};


interface DashboardStats {
  summary: {
    totalSales: number;
    totalRevenue: number;
    todaySales: number;
    todayRevenue: number;
  };
  lowStockProducts: Array<{
    id: string;
    name: string;
    sku: string;
    stockQuantity: number;
    price: number;
  }>;
  topProducts: Array<{
    productId: string;
    _sum: { quantity: number };
    _count: number;
    product: {
      name: string;
      sku: string;
      price: number;
    };
  }>;
}

const DashboardPage: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: salesAPI.getDashboardStats,
  });

  const { data: recentSales, isLoading: salesLoading } = useQuery({
    queryKey: ['recent-sales'],
    queryFn: () => salesAPI.getAll({ limit: 5 }),
    retry: 1,
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products-low-stock'],
    queryFn: () => productsAPI.getAll({ limit: 100 }),
  });

  const statsData: DashboardStats = stats || {
    summary: { totalSales: 0, totalRevenue: 0, todaySales: 0, todayRevenue: 0 },
    lowStockProducts: [],
    topProducts: [],
  };

  const lowStockCount = products?.data?.filter(
    (p: any) => p.stockQuantity < 10
  ).length || 0;

  const statCards = [
    {
      title: 'Total Sales',
      value: formatNumber(statsData.summary.totalSales),
      icon: <ShoppingCartOutlined />,
      color: '#1890ff',
      change: '+12%',
      trend: 'up',
    },
    {
      title: 'Total Revenue',
      value: `$ ${formatNumber(statsData.summary.totalRevenue, true)}`,
      icon: <DollarOutlined />,
      color: '#52c41a',
      change: '+8%',
      trend: 'up',
    },
    {
      title: 'Today Sales',
      value: formatNumber(statsData.summary.todaySales),
      icon: <ShoppingCartOutlined />,
      color: '#722ed1',
      change: statsData.summary.todaySales > 0 ? '+100%' : '0%',
      trend: statsData.summary.todaySales > 0 ? 'up' : 'neutral',
    },
    {
      title: 'Low Stock Items',
      value: formatNumber(lowStockCount),
      icon: <WarningOutlined />,
      color: '#fa8c16',
      change: lowStockCount > 0 ? 'Need attention' : 'All good',
      trend: lowStockCount > 0 ? 'down' : 'up',
    },
  ];

  const lowStockColumns = [
    {
      title: 'Product',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
    },
    {
      title: 'Stock',
      dataIndex: 'stockQuantity',
      key: 'stockQuantity',
      render: (quantity: number) => (
        <Tag color={quantity < 5 ? 'red' : quantity < 10 ? 'orange' : 'green'}>
          {quantity} units
        </Tag>
      ),
    },
    {
        title: 'Price',
        dataIndex: 'price',
        key: 'price',
        width: 120,
        render: (price: any) => {
            // Convert to number if it's a string
            const priceNum = typeof price === 'string' ? parseFloat(price) : price;
            return `$ ${formatNumber(priceNum, true)}`;
        },
        sorter: (a: Product, b: Product) => {
            const priceA = typeof a.price === 'string' ? parseFloat(a.price) : a.price;
            const priceB = typeof b.price === 'string' ? parseFloat(b.price) : b.price;
            return priceA - priceB;
        },
    },
  ];

  const recentSalesColumns = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('MMM D, YYYY HH:mm'),
    },
    {
      title: 'Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: number) => (
        <Text strong>$ {formatNumber(amount, true)}</Text>
      ),
    },
    {
      title: 'Items',
      key: 'items',
      render: (_: any, record: any) => (
        <Space direction="vertical" size={0}>
          {record.items.slice(0, 2).map((item: any, index: number) => (
            <Text key={index} type="secondary">
              {item.product?.name} × {item.quantity}
            </Text>
          ))}
          {record.items.length > 2 && (
            <Text type="secondary">+{record.items.length - 2} more</Text>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        Dashboard Overview
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card>
              <Statistic
                title={stat.title}
                value={stat.value}
                prefix={stat.icon}
                valueStyle={{ color: stat.color }}
              />
              <div style={{ marginTop: 8 }}>
                <Space>
                  {stat.trend === 'up' && (
                    <ArrowUpOutlined style={{ color: '#52c41a' }} />
                  )}
                  {stat.trend === 'down' && (
                    <ArrowDownOutlined style={{ color: '#ff4d4f' }} />
                  )}
                  <Text type="secondary">{stat.change}</Text>
                </Space>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title="Recent Sales"
            loading={salesLoading}
            extra={
              <Text type="secondary">
                Last 5 transactions
              </Text>
            }
          >
            <Table
              columns={recentSalesColumns}
              dataSource={recentSales?.data || []}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title="Low Stock Alert"
            loading={productsLoading}
            extra={
              <Tag color={lowStockCount > 0 ? 'warning' : 'success'}>
                {lowStockCount} items
              </Tag>
            }
          >
            <Table
              columns={lowStockColumns}
              dataSource={statsData.lowStockProducts}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card title="Top Selling Products" loading={statsLoading}>
            {statsData.topProducts.length > 0 ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                {statsData.topProducts.map((item, index) => (
                  <div key={item.productId} style={{ width: '100%' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8,
                      }}
                    >
                      <Space>
                        <Text strong>#{index + 1}</Text>
                        <div>
                          <div>{item.product?.name}</div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            SKU: {item.product?.sku}
                          </Text>
                        </div>
                      </Space>
                      <div style={{ textAlign: 'right' }}>
                        <div>
                          <Text strong>{item._sum.quantity}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {' '}units sold
                          </Text>
                        </div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          ${item.product?.price?.toFixed(2)} each
                        </Text>
                      </div>
                    </div>
                    <Progress
                      percent={Math.min((item._sum.quantity / 100) * 100, 100)}
                      showInfo={false}
                      strokeColor="#52c41a"
                    />
                  </div>
                ))}
              </Space>
            ) : (
              <Text type="secondary">No sales data available</Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;