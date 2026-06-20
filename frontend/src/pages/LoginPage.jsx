import { useState } from 'react';
import { Form, Input, Button, Card, message, Alert } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../services/auth';
import useAuthStore from '../store/useAuthStore';

const ROLE_HOME = { INVESTOR: '/investor/submit', EMPLOYEE: '/employee/tasks', MANAGER: '/manager/dashboard' };

const DEMO_ACCOUNTS = [
  { role: 'مستثمر',  username: 'investor1', password: 'pass123' },
  { role: 'موظف',   username: 'emp_g1',    password: 'pass123' },
  { role: 'مدير',   username: 'manager1',   password: 'pass123' },
];

const LoginPage = () => {
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const onLoginFinish = async (values) => {
    setLoading(true); setError(null);
    try {
      const res = await login(values);
      setAuth(res.data.token, res.data.user);
      message.success(`مرحباً ${res.data.user.username}!`);
      navigate(ROLE_HOME[res.data.user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.message || 'فشل تسجيل الدخول');
    } finally { setLoading(false); }
  };

  const onRegisterFinish = async (values) => {
    setLoading(true); setError(null);
    try {
      const payload = {
        ...values,
        role: 'INVESTOR'
      };
      await register(payload);
      message.success('تم إنشاء حساب المستثمر بنجاح! يمكنك الآن تسجيل الدخول.');
      setIsRegister(false);
      loginForm.setFieldsValue({ username: values.username, password: values.password });
    } catch (err) {
      setError(err.response?.data?.message || 'فشل إنشاء الحساب');
    } finally { setLoading(false); }
  };

  const fillDemo = (username, password) => { loginForm.setFieldsValue({ username, password }); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] to-[#2d5a9a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#c9a84c] flex items-center justify-center mx-auto mb-4 text-3xl font-bold text-[#1e3a5f]">ب</div>
          <h1 className="text-white text-2xl font-bold mb-1">بوابة الاستثمار الحكومية</h1>
          <p className="text-blue-200 text-sm">جمهورية مصر العربية — هيئة الاستثمار</p>
        </div>

        <Card className="shadow-2xl">
          <h2 className="text-[#1e3a5f] font-bold text-lg mb-4 text-center">
            {isRegister ? 'إنشاء حساب مستثمر جديد' : 'تسجيل الدخول'}
          </h2>

          {error && <Alert type="error" message={error} className="mb-4" />}

          {!isRegister ? (
            <>
              <Form form={loginForm} onFinish={onLoginFinish} layout="vertical" requiredMark={false}>
                <Form.Item name="username" label="اسم المستخدم" rules={[{ required: true, message: 'مطلوب' }]}>
                  <Input prefix={<UserOutlined />} size="large" placeholder="اسم المستخدم" />
                </Form.Item>
                <Form.Item name="password" label="كلمة المرور" rules={[{ required: true, message: 'مطلوب' }]}>
                  <Input.Password prefix={<LockOutlined />} size="large" placeholder="كلمة المرور" />
                </Form.Item>
                <Button
                  type="primary" htmlType="submit" block size="large"
                  loading={loading}
                  style={{ background: '#1e3a5f', borderColor: '#1e3a5f', height: 48 }}
                >
                  دخول
                </Button>
              </Form>

              <div className="text-center mt-4">
                <span className="text-gray-500 text-sm">ليس لديك حساب؟ </span>
                <Button type="link" onClick={() => { setIsRegister(true); setError(null); }} className="p-0 text-[#1e3a5f] font-bold">
                  إنشاء حساب جديد
                </Button>
              </div>

              {/* Demo accounts */}
              <div className="mt-6 border-t pt-4">
                <p className="text-xs text-gray-400 text-center mb-3">حسابات تجريبية (كلمة المرور: pass123)</p>
                <div className="flex gap-2 flex-wrap justify-center">
                  {DEMO_ACCOUNTS.map((a) => (
                    <button
                      key={a.username}
                      onClick={() => fillDemo(a.username, a.password)}
                      className="text-xs px-3 py-1 rounded-full bg-gray-100 hover:bg-[#1e3a5f] hover:text-white transition-colors"
                    >
                      {a.role}: {a.username}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <Form form={registerForm} onFinish={onRegisterFinish} layout="vertical" requiredMark={false}>
                <Form.Item name="username" label="اسم المستخدم" rules={[{ required: true, message: 'اسم المستخدم مطلوب' }]}>
                  <Input prefix={<UserOutlined />} size="large" placeholder="اختر اسم مستخدم" />
                </Form.Item>
                <Form.Item name="email" label="البريد الإلكتروني" rules={[{ required: true, type: 'email', message: 'يرجى إدخال بريد إلكتروني صالح' }]}>
                  <Input prefix={<MailOutlined />} size="large" placeholder="email@example.com" />
                </Form.Item>
                <Form.Item name="phone" label="رقم الهاتف" rules={[{ required: true, message: 'رقم الهاتف مطلوب' }]}>
                  <Input prefix={<PhoneOutlined />} size="large" placeholder="01XXXXXXXXX" />
                </Form.Item>
                <Form.Item name="password" label="كلمة المرور" rules={[{ required: true, message: 'كلمة المرور مطلوبة' }]}>
                  <Input.Password prefix={<LockOutlined />} size="large" placeholder="كلمة المرور" />
                </Form.Item>
                <Button
                  type="primary" htmlType="submit" block size="large"
                  loading={loading}
                  style={{ background: '#c9a84c', borderColor: '#c9a84c', color: '#1e3a5f', fontWeight: 'bold', height: 48 }}
                >
                  إنشاء الحساب كمستثمر
                </Button>
              </Form>

              <div className="text-center mt-4">
                <span className="text-gray-500 text-sm">لديك حساب بالفعل؟ </span>
                <Button type="link" onClick={() => { setIsRegister(false); setError(null); }} className="p-0 text-[#1e3a5f] font-bold">
                  تسجيل الدخول
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
