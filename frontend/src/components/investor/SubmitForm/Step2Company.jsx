import { Form, Input, Select } from 'antd';
import { BankOutlined, EnvironmentOutlined } from '@ant-design/icons';

const COMPANY_TYPES = [
  'شركة ذات مسؤولية محدودة (LLC)',
  'شركة مساهمة',
  'شركة توصية بسيطة',
  'شركة تضامن',
  'مؤسسة فردية',
];

const ACTIVITIES = [
  'تكنولوجيا المعلومات', 'الصناعة والتصنيع', 'السياحة والفندقة',
  'الزراعة والغذاء', 'الطاقة المتجددة', 'الرعاية الصحية',
  'التعليم والتدريب', 'العقارات والإنشاءات', 'التجارة والتوزيع', 'أخرى',
];

const Step2Company = () => (
  <div className="space-y-2">
    <h3 className="text-lg font-semibold text-[#1e3a5f] mb-4">بيانات الشركة</h3>
    <Form.Item name={['company', 'name']} label="اسم الشركة" rules={[{ required: true, message: 'اسم الشركة مطلوب' }]}>
      <Input prefix={<BankOutlined />} placeholder="الاسم الكامل للشركة" size="large" />
    </Form.Item>
    <Form.Item name={['company', 'type']} label="الشكل القانوني" rules={[{ required: true, message: 'الشكل القانوني مطلوب' }]}>
      <Select placeholder="اختر الشكل القانوني" size="large" options={COMPANY_TYPES.map((t) => ({ value: t, label: t }))} />
    </Form.Item>
    <Form.Item name={['company', 'activity']} label="النشاط التجاري" rules={[{ required: true, message: 'النشاط التجاري مطلوب' }]}>
      <Select placeholder="اختر النشاط" size="large" options={ACTIVITIES.map((a) => ({ value: a, label: a }))} />
    </Form.Item>
    <Form.Item name={['company', 'address']} label="العنوان" rules={[{ required: true, message: 'العنوان مطلوب' }]}>
      <Input prefix={<EnvironmentOutlined />} placeholder="المحافظة، المدينة، الشارع" size="large" />
    </Form.Item>
  </div>
);

export default Step2Company;
