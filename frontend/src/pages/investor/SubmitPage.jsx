import { useState } from 'react';
import { Form, Steps, Button, Card, Result, message, Alert } from 'antd';
import { useNavigate } from 'react-router-dom';
import Step1Personal    from '../../components/investor/SubmitForm/Step1Personal';
import Step2Company     from '../../components/investor/SubmitForm/Step2Company';
import Step3Investment  from '../../components/investor/SubmitForm/Step3Investment';
import Step4Review      from '../../components/investor/SubmitForm/Step4Review';
import { useInvestment } from '../../hooks/useInvestment';

const STEPS = ['البيانات الشخصية', 'بيانات الشركة', 'تفاصيل الاستثمار', 'مراجعة وإرسال'];

const SubmitPage = () => {
  const [form]    = Form.useForm();
  const [current, setCurrent] = useState(0);
  const [result,  setResult]  = useState(null);
  const { loading, error, startInvestment } = useInvestment();

  const next = async () => {
    try {
      await form.validateFields();
      setCurrent((c) => c + 1);
    } catch { /* validation errors shown inline */ }
  };

  const submit = async () => {
    try {
      const values = form.getFieldsValue(true);
      const res = await startInvestment(values);
      setResult(res);
    } catch { /* error shown by hook */ }
  };

  if (result) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Result
          status="success"
          title="تم تقديم الطلب بنجاح!"
          subTitle={
            <div className="text-center">
              <p className="mb-2">رقم الطلب:</p>
              <code className="text-lg font-bold text-[#1e3a5f] bg-blue-50 px-4 py-2 rounded">{result.processInstanceId}</code>
              <p className="mt-3 text-gray-500">احتفظ بهذا الرقم لمتابعة حالة طلبك</p>
            </div>
          }
          extra={[
            <Button
              key="track"
              type="primary"
              style={{ background: '#1e3a5f' }}
              onClick={() => window.location.href = `/investor/status?id=${result.processInstanceId}`}
            >
              تتبع الطلب
            </Button>,
            <Button key="new" onClick={() => { setResult(null); setCurrent(0); form.resetFields(); }}>
              تقديم طلب جديد
            </Button>,
          ]}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-sm" title={<span className="text-[#1e3a5f] font-bold text-lg">تقديم طلب استثمار جديد</span>}>
        <Steps
          current={current}
          items={STEPS.map((t) => ({ title: t }))}
          className="mb-8"
          size="small"
        />

        {error && <Alert type="error" message={error} className="mb-4" />}

        <Form form={form} layout="vertical" requiredMark="optional" scrollToFirstError>
          {current === 0 && <Step1Personal form={form} />}
          {current === 1 && <Step2Company />}
          {current === 2 && <Step3Investment />}
          {current === 3 && <Step4Review values={form.getFieldsValue(true)} />}
        </Form>

        <div className="flex justify-between mt-6 pt-4 border-t">
          <Button disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
            السابق
          </Button>
          {current < STEPS.length - 1 ? (
            <Button type="primary" style={{ background: '#1e3a5f' }} onClick={next}>
              التالي
            </Button>
          ) : (
            <Button
              type="primary"
              loading={loading}
              onClick={submit}
              style={{ background: '#c9a84c', borderColor: '#c9a84c', color: '#1e3a5f', fontWeight: 700 }}
            >
              إرسال الطلب
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default SubmitPage;
