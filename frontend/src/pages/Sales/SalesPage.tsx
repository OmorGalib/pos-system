import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  InputNumber,
  Select,
  Space,
  Card,
  Row,
  Col,
  Typography,
  Tag,
  message,
  DatePicker,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesAPI, productsAPI, Product, Sale } from '../../api/endpoints';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface SaleItem {
  productId: string;
  quantity: number;
  product?: Product;
}

const formatNumber = (value: number | string, currency = false) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return currency ? '$0.00' : '0';

  return (
    (currency ? '$' : '') +
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: currency ? 2 : 0,
      maximumFractionDigits: currency ? 2 : 0,
    }).format(num)
  );
};


const SalesPage: React.FC = () => {
  const [saleModalVisible, setSaleModalVisible] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<SaleItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    null,
    null,
  ]);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // Fetch products for sale
  const { data: productsData } = useQuery({
    queryKey: ['products-for-sale'],
    queryFn: () => productsAPI.getAll({ limit: 1000 }),
  });

  // Fetch sales with filters
  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales', dateRange],
    queryFn: () => {
      const params: any = { limit: 10 };
      if (dateRange[0]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
      }
      if (dateRange[1]) {
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }
      return salesAPI.getAll(params);
    },
  });

  // Fetch dashboard stats
  const { data: statsData } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: salesAPI.getDashboardStats,
  });

  // Create sale mutation
  const createSaleMutation = useMutation({
    mutationFn: salesAPI.create,
    onSuccess: () => {
      message.success('Sale created successfully!');
      setSaleModalVisible(false);
      setSelectedProducts([]);
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to create sale');
    },
  });

  const products = productsData?.data || [];

  const getProductById = (id: string) => {
    return products.find((p: Product) => p.id === id);
  };

  const calculateTotal = () => {
    return selectedProducts.reduce((total, item) => {
      const product = getProductById(item.productId);
      if (product) {
        return total + product.price * item.quantity;
      }
      return total;
    }, 0);
  };

  const handleAddProduct = () => {
    if (!selectedProduct) {
      message.warning('Please select a product');
      return;
    }

    if (quantity < 1) {
      message.warning('Quantity must be at least 1');
      return;
    }

    const product = getProductById(selectedProduct);
    if (!product) {
      message.error('Product not found');
      return;
    }

    // Check stock
    if (product.stockQuantity < quantity) {
      message.error(
        `Insufficient stock. Available: ${product.stockQuantity}`
      );
      return;
    }

    const existingIndex = selectedProducts.findIndex(
      (item) => item.productId === selectedProduct
    );

    if (existingIndex >= 0) {
      const updated = [...selectedProducts];
      const newQuantity = updated[existingIndex].quantity + quantity;
      
      if (product.stockQuantity < newQuantity) {
        message.error(
          `Insufficient stock for additional quantity. Available: ${
            product.stockQuantity - updated[existingIndex].quantity
          }`
        );
        return;
      }
      
      updated[existingIndex].quantity = newQuantity;
      setSelectedProducts(updated);
    } else {
      setSelectedProducts([
        ...selectedProducts,
        { productId: selectedProduct, quantity, product },
      ]);
    }

    setSelectedProduct('');
    setQuantity(1);
  };

  const handleRemoveProduct = (index: number) => {
    const updated = [...selectedProducts];
    updated.splice(index, 1);
    setSelectedProducts(updated);
  };

  const handleCreateSale = () => {
    if (selectedProducts.length === 0) {
      message.error('Please add at least one product to the sale');
      return;
    }

    const saleData = {
      items: selectedProducts.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    };

    createSaleMutation.mutate(saleData);
  };

  const handleDateChange = (dates: any) => {
    setDateRange(dates);
  };

  const salesColumns = [
    {
      title: 'Date & Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => (
        <div>
          <div>{dayjs(date).format('MMM D, YYYY')}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {dayjs(date).format('HH:mm')}
          </Text>
        </div>
      ),
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      render: (amount: number) => (
        <Text strong style={{ color: '#52c41a' }}>
          {formatNumber(amount, true)}
        </Text>
      ),
      sorter: (a: Sale, b: Sale) => a.totalAmount - b.totalAmount,
    },
    {
      title: 'Items',
      key: 'items',
      render: (_: any, record: Sale) => (
        <Space direction="vertical" size={2}>
          {record.items.slice(0, 3).map((item, index) => (
            <div key={index} style={{ fontSize: 12 }}>
              <Text>{item.product?.name}</Text>
              <Text type="secondary"> × {item.quantity}</Text>
            </div>
          ))}
          {record.items.length > 3 && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              +{record.items.length - 3} more items
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Details',
      key: 'details',
      width: 100,
      render: (_: any, record: Sale) => (
        <Button
          type="link"
          onClick={() => {
            Modal.info({
              title: 'Sale Details',
              width: 600,
              content: (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>Sale ID: </Text>
                    <Text copyable>{record.id}</Text>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>Date: </Text>
                    <Text>{dayjs(record.createdAt).format('llll')}</Text>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>Total Amount: </Text>
                    <Text strong style={{ color: '#52c41a' }}>
                      {formatNumber(record.totalAmount, true)}
                    </Text>
                  </div>
                  <Table
                    dataSource={record.items}
                    rowKey={(item) => `${item.productId}-${item.quantity}`}
                    pagination={false}
                    size="small"
                    columns={[
                      {
                        title: 'Product',
                        dataIndex: ['product', 'name'],
                        key: 'product',
                      },
                      {
                        title: 'SKU',
                        dataIndex: ['product', 'sku'],
                        key: 'sku',
                        width: 120,
                      },
                      {
                        title: 'Price',
                        dataIndex: 'price',
                        key: 'price',
                        width: 100,
                        render: (price: number) => formatNumber(price, true),
                      },
                      {
                        title: 'Quantity',
                        dataIndex: 'quantity',
                        key: 'quantity',
                        width: 100,
                      },
                      {
                        title: 'Subtotal',
                        key: 'subtotal',
                        width: 120,
                        render: (_: any, item: any) => (
                          <Text strong>
                            {formatNumber((item.price || 0) * item.quantity, true)}
                          </Text>
                        ),
                      },
                    ]}
                  />
                </div>
              ),
            });
          }}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Today's Sales"
              value={statsData?.summary?.todaySales || 0}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Today's Revenue"
              value={statsData?.summary?.todayRevenue || 0}
              prefix={<DollarOutlined />}
              precision={2}
              valueStyle={{ color: '#52c41a' }}
              formatter={(value) => formatNumber(value as number, true)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Sales"
              value={statsData?.summary?.totalSales || 0}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={statsData?.summary?.totalRevenue || 0}
              prefix={<DollarOutlined />}
              precision={2}
              valueStyle={{ color: '#fa8c16' }}
              formatter={(value) => formatNumber(value as number, true)}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={3} style={{ margin: 0 }}>
                Sales History
              </Title>
            </Col>
            <Col>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setSaleModalVisible(true)}
                size="large"
              >
                New Sale
              </Button>
            </Col>
          </Row>
        }
      >
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Space>
              <RangePicker
                value={dateRange}
                onChange={handleDateChange}
                format="YYYY-MM-DD"
                allowClear
              />
            </Space>
          </Col>
          <Col>
            <Text type="secondary">
              Showing {salesData?.data?.length || 0} of{' '}
              {salesData?.meta?.total || 0} sales
            </Text>
          </Col>
        </Row>

        <Table
          columns={salesColumns}
          dataSource={salesData?.data || []}
          loading={isLoading}
          rowKey="id"
          pagination={{
            current: salesData?.meta?.page || 1,
            pageSize: salesData?.meta?.limit || 10,
            total: salesData?.meta?.total || 0,
            showSizeChanger: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} sales`,
          }}
        />
      </Card>

      {/* New Sale Modal */}
      <Modal
        title="Create New Sale"
        open={saleModalVisible}
        onCancel={() => {
          setSaleModalVisible(false);
          setSelectedProducts([]);
          setSelectedProduct('');
          setQuantity(1);
        }}
        width={800}
        footer={null}
        destroyOnClose
      >
        <Row gutter={24}>
          <Col span={12}>
            <Card title="Add Product" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Select
                  placeholder="Select a product"
                  style={{ width: '100%' }}
                  value={selectedProduct}
                  onChange={setSelectedProduct}
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={products.map((product: Product) => ({
                    value: product.id,
                    label: `${product.name} (${product.sku}) - Stock: ${product.stockQuantity} - $${product.price}`,
                    disabled: product.stockQuantity === 0,
                  }))}
                />
                <InputNumber
                  placeholder="Quantity"
                  min={1}
                  value={quantity}
                  onChange={(value) => setQuantity(value || 1)}
                  style={{ width: '100%' }}
                />
                <Button
                  type="primary"
                  onClick={handleAddProduct}
                  block
                  disabled={!selectedProduct}
                >
                  Add to Sale
                </Button>
              </Space>
            </Card>
          </Col>
          <Col span={12}>
            <Card
              title={
                <Row justify="space-between" align="middle">
                  <span>Sale Items</span>
                  <Tag color="blue">{selectedProducts.length} items</Tag>
                </Row>
              }
              size="small"
              extra={
                <Text strong style={{ fontSize: 16 }}>
                  Total: {formatNumber(calculateTotal(), true)}
                </Text>
              }
            >
              {selectedProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <ShoppingCartOutlined style={{ fontSize: 48, color: '#ddd' }} />
                  <div style={{ marginTop: 16, color: '#999' }}>
                    No products added yet
                  </div>
                </div>
              ) : (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {selectedProducts.map((item, index) => {
                    const product = getProductById(item.productId);
                    if (!product) return null;

                    return (
                      <Card
                        key={`${item.productId}-${index}`}
                        size="small"
                        style={{ marginBottom: 8 }}
                        bodyStyle={{ padding: '12px' }}
                      >
                        <Row justify="space-between" align="middle">
                          <Col flex="auto">
                            <div>
                              <Text strong>{product.name}</Text>
                            </div>
                            <div style={{ marginTop: 4 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                SKU: {product.sku} | Stock: {product.stockQuantity}
                              </Text>
                            </div>
                          </Col>
                          <Col>
                            <Space>
                              <Text>
                                {item.quantity} × {formatNumber(product.price, true)}
                              </Text>
                              <Text strong style={{ color: '#52c41a' }}>
                                {formatNumber(item.quantity * product.price, true)}
                              </Text>
                              <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => handleRemoveProduct(index)}
                                size="small"
                              />
                            </Space>
                          </Col>
                        </Row>
                      </Card>
                    );
                  })}
                </Space>
              )}

              {selectedProducts.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <Button
                    type="primary"
                    size="large"
                    onClick={handleCreateSale}
                    loading={createSaleMutation.isPending}
                    block
                    disabled={createSaleMutation.isPending}
                  >
                    Complete Sale ({formatNumber(calculateTotal(), true)})
                  </Button>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </Modal>
    </div>
  );
};

export default SalesPage;