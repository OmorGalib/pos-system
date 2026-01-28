import React from 'react';
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
  MailOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const { Title, Text } = Typography;

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, error } = useAuth();
  const [formError, setFormError] = React.useState<string>('');
  const [form] = Form.useForm();

  const onFinish = async (values: any) => {
    setFormError('');
    try {
        // Create registration data without confirmPassword
        const registrationData = {
        email: values.email,
        password: values.password,
        name: values.name
        };
        
        await register(registrationData);
    } catch (err: any) {
        setFormError(err.message || 'Registration failed. Please try again.');
    }
 };
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #9ffb93ff 0%, #f5576c 100%)',
        padding: '20px',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
        bodyStyle={{ padding: '40px' }}
      >
        <div style={{ marginBottom: 32 }}>
          <Space style={{ marginBottom: 16 }}>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/login')}
            >
              Back to Login
            </Button>
          </Space>
          <div style={{ textAlign: 'center' }}>
            <Title level={2} style={{ margin: 0 }}>
              Create Account
            </Title>
            <Text type="secondary">Join our POS system</Text>
          </div>
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
            message="Registration failed"
            description={error.message}
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <Form
          form={form}
          name="register"
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="name"
            label="Full Name"
            rules={[
              { required: false },
              { min: 2, message: 'Name must be at least 2 characters' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="John Doe" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please input your email!' },
              { type: 'email', message: 'Please enter a valid email!' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="email@example.com" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Please input your password!' },
              { min: 6, message: 'Password must be at least 6 characters' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="At least 6 characters"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error('The two passwords do not match!')
                  );
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Confirm password" />
          </Form.Item>

          <Form.Item style={{ marginTop: 32 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              block
              size="large"
            >
              Create Account
            </Button>
          </Form.Item>

          <Divider>
            <Text type="secondary">Already have an account?</Text>
          </Divider>

          <div style={{ textAlign: 'center' }}>
            <Link to="/login">
              <Button type="link" size="large">
                Sign in instead
              </Button>
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default RegisterPage;