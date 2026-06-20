import { Form, Input, InputNumber, Select } from 'antd';
import { DollarOutlined, TeamOutlined } from '@ant-design/icons';

const INVESTMENT_TYPES = [
  'استثمار أجنبي مباشر', 'استثمار محلي', 'مشروع مشترك',
  'شراكة عامة خاصة (PPP)', 'استثمار في البنية التحتية',
];

const Step3Investment = () => (
  <div className="space-y-2">
    <h3 className="text-lg font-semibold text-[#1e3a5f] mb-4">تفاصيل الاستثمار</h3>
    <Form.Item
      name={['investment', 'amount']}
      label="رأس المال المستثمر (جنيه مصري)"
      rules={[{ required: true, type: 'number', min: 1, message: 'رأس المال مطلوب' }]}
    >
      <InputNumber
        prefix={<DollarOutlined />}
        placeholder="0"
        size="large"
        className="w-full"
        formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
        parser={(v) => v.replace(/,*/g, '')}
        min={1}
      />
    </Form.Item>
    <Form.Item name={['investment', 'type']} label="نوع الاستثمار" rules={[{ required: true, message: 'نوع الاستثمار مطلوب' }]}>
      <Select placeholder="اختر نوع الاستثمار" size="large" options={INVESTMENT_TYPES.map((t) => ({ value: t, label: t }))} />
    </Form.Item>
    <Form.Item
      name={['investment', 'partners']}
      label="عدد الشركاء"
      rules={[{ required: true, type: 'number', min: 1, message: 'عدد الشركاء مطلوب' }]}
    >
      <InputNumber prefix={<TeamOutlined />} min={1} max={50} size="large" className="w-full" placeholder="عدد الشركاء" />
    </Form.Item>
    <Form.Item name={['investment', 'notes']} label="ملاحظات إضافية">
      <Input.TextArea rows={3} placeholder="أي معلومات إضافية تريد إضافتها..." />
    </Form.Item>
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
      <strong>ملاحظة:</strong> أقل من 500,000 جنيه → موافقة تلقائية | أقل من 5,000,000 → متوسط (24 ساعة) | أكثر من ذلك → مرتفع (48 ساعة)
    </div>
  </div>
);

export default Step3Investment;
