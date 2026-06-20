import { useEffect, useState } from 'react';
import { Card, Button, Form, Input, Spin, message, Empty, Tag, Modal } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import useAuthStore from '../../store/useAuthStore';
import { useTasks } from '../../hooks/useTasks';
import api from '../../services/api';

const MissingDataPage = () => {
  const { user } = useAuthStore();
  const { fetchTasks, loading } = useTasks();
  const [tasks,    setTasks]    = useState([]);
  const [selected, setSelected] = useState(null);
  const [form]     = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const all = await fetchTasks(user?.approvalGroup, 'COMPLETED');
      setTasks((all || []).filter((t) => t.status === 'COMPLETED' && t.decision === 'MISSING_DATA'));
    })();
  }, []);

  const handleSubmit = async (values) => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await api.post(`/investment/${selected.processInstanceId}/complete-data`, { data: values });
      message.success('تم استكمال البيانات بنجاح');
      setSelected(null);
      form.resetFields();
      const all = await fetchTasks(user?.approvalGroup, 'COMPLETED');
      setTasks((all || []).filter((t) => t.status === 'COMPLETED' && t.decision === 'MISSING_DATA'));
    } catch { message.error('فشل إرسال البيانات'); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1e3a5f] mb-6">استكمال البيانات الناقصة</h1>

      {loading && <div className="text-center py-12"><Spin size="large" /></div>}

      {!loading && tasks.length === 0 && (
        <Empty description="لا توجد طلبات بيانات ناقصة" className="py-16" />
      )}

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {tasks.map((task) => (
          <Card
            key={task.taskId}
            className="hover-card border-l-4 border-orange-400"
            size="small"
            title={<span className="text-[#1e3a5f] font-semibold">{task.investorName || task.taskId}</span>}
            extra={<Tag color="orange" icon={<WarningOutlined />}>بيانات ناقصة</Tag>}
          >
            <div className="text-sm text-gray-600 mb-2">رقم الطلب: <code>{task.processInstanceId}</code></div>
            {task.missingFields?.length > 0 && (
              <div className="mb-3">
                <span className="text-xs text-gray-500">الحقول الناقصة:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {task.missingFields.map((f) => <Tag key={f} color="orange" className="text-xs">{f}</Tag>)}
                </div>
              </div>
            )}
            <Button size="small" type="primary" style={{ background: '#1e3a5f' }} onClick={() => setSelected(task)}>
              استكمال البيانات
            </Button>
          </Card>
        ))}
      </div>

      <Modal
        open={!!selected}
        onCancel={() => { setSelected(null); form.resetFields(); }}
        title="استكمال البيانات الناقصة"
        footer={null}
        width={500}
      >
        {selected && (
          <>
            <div className="mb-4">
              <Tag color="orange">الحقول الناقصة: {selected.missingFields?.join('، ')}</Tag>
            </div>
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              {(selected.missingFields || []).map((field) => (
                <Form.Item key={field} name={field} label={field} rules={[{ required: true, message: `${field} مطلوب` }]}>
                  <Input placeholder={`أدخل ${field}`} />
                </Form.Item>
              ))}
              <div className="flex justify-end gap-3 mt-4">
                <Button onClick={() => setSelected(null)}>إلغاء</Button>
                <Button type="primary" htmlType="submit" loading={submitting} style={{ background: '#1e3a5f' }}>
                  إرسال البيانات
                </Button>
              </div>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
};

export default MissingDataPage;
