import { Form, Input } from 'antd';
import { UserOutlined, IdcardOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';

const Step1Personal = ({ form }) => (
  <div className="space-y-2">
    <h3 className="text-lg font-semibold text-[#1e3a5f] mb-4">البيانات الشخصية</h3>
    <Form.Item name={['investor', 'fullName']} label="الاسم الكامل" rules={[{ required: true, message: 'الاسم مطلوب' }]}>
      <Input prefix={<UserOutlined />} placeholder="أدخل الاسم الكامل" size="large" />
    </Form.Item>
    <Form.Item
      name={['investor', 'nationalId']}
      label="الرقم القومي"
      rules={[
        { required: true, message: 'الرقم القومي مطلوب' },
        { len: 14, message: 'الرقم القومي يجب أن يكون 14 رقماً' },
        { pattern: /^\d+$/, message: 'أرقام فقط' },
      ]}
    >
      <Input prefix={<IdcardOutlined />} placeholder="14 رقماً" size="large" maxLength={14} />
    </Form.Item>
    <Form.Item
      name={['investor', 'email']}
      label="البريد الإلكتروني"
      rules={[{ required: true, type: 'email', message: 'بريد إلكتروني صحيح مطلوب' }]}
    >
      <Input prefix={<MailOutlined />} placeholder="example@domain.com" size="large" dir="ltr" />
    </Form.Item>
    <Form.Item
      name={['investor', 'phone']}
      label="رقم الهاتف"
      rules={[{ required: true, pattern: /^01[0-9]{9}$/, message: 'رقم هاتف مصري صحيح (11 رقم)' }]}
    >
      <Input prefix={<PhoneOutlined />} placeholder="01XXXXXXXXX" size="large" maxLength={11} dir="ltr" />
    </Form.Item>
  </div>
);

export default Step1Personal;
