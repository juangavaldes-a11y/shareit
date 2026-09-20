import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Select, Tabs, Typography } from 'antd';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';

const passwordRules = [
  { required: true, message: 'Enter a password.' },
  { min: 12, message: 'Use at least 12 characters.' },
  { max: 128, message: 'Use no more than 128 characters.' },
];

function AuthPage() {
  const { isAuthenticated, login, register } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const redirectTo = location.state?.from || '/';

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const submitLogin = async (values) => {
    setError('');
    setSubmitting(true);
    try {
      await login(values);
      navigate(redirectTo, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitRegistration = async (values) => {
    setError('');
    setSubmitting(true);
    try {
      await register({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        role: values.role,
      });
      navigate(redirectTo, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create your account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const tabItems = [
    {
      key: 'sign-in',
      label: 'Sign in',
      children: (
        <Form layout="vertical" requiredMark={false} onFinish={submitLogin}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Enter a valid email address.' }]}>
            <Input autoComplete="email" inputMode="email" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={passwordRules}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button block type="primary" htmlType="submit" loading={submitting}>Sign in</Button>
        </Form>
      ),
    },
    {
      key: 'register',
      label: 'Create account',
      children: (
        <Form layout="vertical" requiredMark={false} onFinish={submitRegistration}>
          <Form.Item name="fullName" label="Full name" rules={[{ required: true, min: 2, max: 120, message: 'Enter your full name.' }]}>
            <Input autoComplete="name" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Enter a valid email address.' }]}>
            <Input autoComplete="email" inputMode="email" />
          </Form.Item>
          <Form.Item name="role" label="I want to" initialValue="renter" rules={[{ required: true }]}>
            <Select options={[
              { value: 'renter', label: 'Rent items' },
              { value: 'owner', label: 'List items' },
            ]} />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={passwordRules}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Confirm password"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Confirm your password.' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  return !value || getFieldValue('password') === value
                    ? Promise.resolve()
                    : Promise.reject(new Error('Passwords do not match.'));
                },
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button block type="primary" htmlType="submit" loading={submitting}>Create account</Button>
        </Form>
      ),
    },
  ];

  return (
    <main className="auth-page">
      <Card className="auth-card" bordered={false}>
        <Typography.Title level={2}>Your ShareIt account</Typography.Title>
        <Typography.Paragraph type="secondary">
          Sign in to manage your listings or create an account to get started.
        </Typography.Paragraph>
        {error && <Alert className="auth-error" type="error" message={error} showIcon closable onClose={() => setError('')} />}
        <Tabs items={tabItems} />
      </Card>
    </main>
  );
}

export default AuthPage;