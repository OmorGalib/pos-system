import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Alert,
  Divider,
  Space,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/authStore';

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error } = useAuth();
  const { isAuthenticated } = useAuthStore();
  const [formError, setFormError] = useState<string>('');

  const from = (location.state as any)?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const onFinish = async (values: { email: string; password: string }) => {
    setFormError('');
    try {
      await login(values);
    } catch (err: any) {
      setFormError(err.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
        bodyStyle={{ padding: '40px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Space direction="vertical" size="large">
            <ShoppingCartOutlined
              style={{ fontSize: 48, color: '#1890ff' }}
            />
            <div>
              <Title level={2} style={{ margin: 0 }}>
                POS System
              </Title>
              <Text type="secondary">Sign in to your account</Text>
            </div>
          </Space>
        </div>

        {formError && (
          <Alert
            message={formError}
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
            closable
            onClose={() => setFormError('')}
          />
        )}

        {error && !formError && (
          <Alert
            message="Login failed"
            description={error.message}
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please input your email!' },
              { type: 'email', message: 'Please enter a valid email!' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Email"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              block
              size="large"
            >
              Sign In
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Text type="secondary">Demo Credentials:</Text>
            <div style={{ marginTop: 8 }}>
              <Text code>admin@pos.com</Text>
              <Text code style={{ marginLeft: 8 }}>
                admin123
              </Text>
            </div>
          </div>

          <Divider>
            <Text type="secondary">OR</Text>
          </Divider>

          <div style={{ textAlign: 'center' }}>
            <Link to="/register">
              <Button type="link">Create new account</Button>
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;