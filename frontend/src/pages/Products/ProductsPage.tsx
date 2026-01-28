import React, { useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Space,
  Popconfirm,
  message,
  Card,
  Row,
  Col,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useProducts } from '../../hooks/useProducts';

const { Title } = Typography;

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

const safeNumber = (value: any): number => {
  if (typeof value === 'string') return parseFloat(value);
  if (typeof value === 'number') return value;
  return 0;
};

interface Product {
  id: string;
  name: string;
  sku: string;
  price: any;
  stockQuantity: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    saleItems: number;
  };
}

const ProductsPage: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  const {
    products,
    pagination: apiPagination,
    isLoading,
    createProduct,
    updateProduct,
    deleteProduct,
    isCreating,
    isUpdating,
    isDeleting,
    refetch,
  } = useProducts({
    page: pagination.current,
    limit: pagination.pageSize,
    search,
  });

  const handleTableChange = (pagination: any) => {
    setPagination({
      current: pagination.current,
      pageSize: pagination.pageSize,
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      const productData = {
        ...values,
        price: typeof values.price === 'string' ? parseFloat(values.price) : values.price,
        stockQuantity: typeof values.stockQuantity === 'string' ? parseInt(values.stockQuantity, 10) : values.stockQuantity,
      };

      if (editingProduct) {
        await updateProduct({ id: editingProduct.id, data: productData });
      } else {
        await createProduct(productData);
      }
      setModalVisible(false);
      form.resetFields();
      setEditingProduct(null);
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    form.setFieldsValue({
      ...product,
      price: safeNumber(product.price),
      stockQuantity: product.stockQuantity,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct(id);
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleView = (product: Product) => {
    setViewingProduct(product);
    setViewModalVisible(true);
  };

  const columns = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 150,
      sorter: (a: Product, b: Product) => a.sku.localeCompare(b.sku),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Product, b: Product) => a.name.localeCompare(b.name),
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (price: any) => formatNumber(price, true),
      sorter: (a: Product, b: Product) => safeNumber(a.price) - safeNumber(b.price),
    },
    {
      title: 'Stock',
      dataIndex: 'stockQuantity',
      key: 'stockQuantity',
      width: 120,
      render: (quantity: number) => (
        <Tag
          color={
            quantity === 0
              ? 'red'
              : quantity < 10
              ? 'orange'
              : quantity < 50
              ? 'blue'
              : 'green'
          }
        >
          {formatNumber(quantity)} units
        </Tag>
      ),
      sorter: (a: Product, b: Product) => a.stockQuantity - b.stockQuantity,
    },
    {
      title: 'Sales',
      dataIndex: ['_count', 'saleItems'],
      key: 'sales',
      width: 100,
      render: (sales: number) => sales || 0,
      sorter: (a: Product, b: Product) => (a._count?.saleItems || 0) - (b._count?.saleItems || 0),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: any, record: Product) => (
        <Space>
          <Tooltip title="View details">
            <Button
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete product"
            description="Are you sure to delete this product? This action cannot be undone."
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ loading: isDeleting }}
          >
            <Tooltip title="Delete">
              <Button danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              Products
            </Title>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingProduct(null);
                form.resetFields();
                setModalVisible(true);
              }}
              size="large"
            >
              Add Product
            </Button>
          </Col>
        </Row>

        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Input
              placeholder="Search products by name or SKU..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
          </Col>
          <Col>
            <Button onClick={() => refetch()} loading={isLoading}>
              Refresh
            </Button>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={products}
          loading={isLoading}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: apiPagination?.total || 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} items`,
          }}
          onChange={handleTableChange}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingProduct ? 'Edit Product' : 'Create Product'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingProduct(null);
        }}
        footer={null}
        // Use destroyOnHidden instead of destroyOnClose
        destroyOnClose={false}
        getContainer={false}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            stockQuantity: 0,
            price: 0,
          }}
        >
          <Form.Item
            name="sku"
            label="SKU"
            rules={[
              { required: true, message: 'Please input SKU!' },
              { min: 3, message: 'SKU must be at least 3 characters' },
              { max: 50, message: 'SKU must be at most 50 characters' },
            ]}
          >
            <Input placeholder="e.g., PROD-001" />
          </Form.Item>
          <Form.Item
            name="name"
            label="Product Name"
            rules={[
              { required: true, message: 'Please input product name!' },
              { min: 2, message: 'Name must be at least 2 characters' },
              { max: 100, message: 'Name must be at most 100 characters' },
            ]}
          >
            <Input placeholder="Enter product name" />
          </Form.Item>
          <Form.Item
            name="price"
            label="Price"
            rules={[
              { required: true, message: 'Please input price!' },
              { type: 'number', min: 0.01, message: 'Price must be at least $0.01' },
            ]}
          >
            <InputNumber
              min={0.01}
              step={0.01}
              style={{ width: '100%' }}
              formatter={(value) =>
                `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
              }
              parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>
          <Form.Item
            name="stockQuantity"
            label="Stock Quantity"
            rules={[
              { required: true, message: 'Please input stock quantity!' },
              { type: 'number', min: 0, message: 'Stock cannot be negative' },
            ]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Space style={{ float: 'right' }}>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  form.resetFields();
                  setEditingProduct(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={isCreating || isUpdating}
              >
                {editingProduct ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal
        title="Product Details"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={null}
      >
        {viewingProduct && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <div>
                  <Typography.Text strong>SKU:</Typography.Text>
                  <div>{viewingProduct.sku}</div>
                </div>
              </Col>
              <Col span={12}>
                <div>
                  <Typography.Text strong>Name:</Typography.Text>
                  <div>{viewingProduct.name}</div>
                </div>
              </Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <div>
                  <Typography.Text strong>Price:</Typography.Text>
                  <div>{formatNumber(viewingProduct.price, true)}</div>
                </div>
              </Col>
              <Col span={12}>
                <div>
                  <Typography.Text strong>Stock Quantity:</Typography.Text>
                  <div>
                    <Tag
                      color={
                        viewingProduct.stockQuantity === 0
                          ? 'red'
                          : viewingProduct.stockQuantity < 10
                          ? 'orange'
                          : viewingProduct.stockQuantity < 50
                          ? 'blue'
                          : 'green'
                      }
                    >
                      {viewingProduct.stockQuantity} units
                    </Tag>
                  </div>
                </div>
              </Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <div>
                  <Typography.Text strong>Total Sales:</Typography.Text>
                  <div>{formatNumber(viewingProduct._count?.saleItems || 0)} items sold</div>                </div>
              </Col>
              <Col span={12}>
                <div>
                  <Typography.Text strong>Created:</Typography.Text>
                  <div>
                    {new Date(viewingProduct.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <div>
                  <Typography.Text strong>Last Updated:</Typography.Text>
                  <div>
                    {new Date(viewingProduct.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProductsPage;