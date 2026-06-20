import { useEffect, useState } from 'react';
import { Card, Alert, Spin, Button, Badge, message, Modal, Descriptions, Tag, Divider } from 'antd';
import { WarningOutlined, ReloadOutlined } from '@ant-design/icons';
import EscalationList from '../../components/manager/EscalationList';
import api from '../../services/api';

const Item = Descriptions.Item;

const EscalationsPage = () => {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState('');

  const decideEscalation = async (id, decision, payload = {}) => {
    try {
      await api.post(`/investment/${id}/decision`, { decision, ...payload });
      message.success(`تم ${decision === 'APPROVED' ? 'الموافقة' : 'الرفض'} بنجاح`);
      setSelected(null);
      setReason('');
      fetchData();
    } catch {
      message.error('فشل تنفيذ القرار');
    }
  };

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get('/investment/escalations');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'فشل التحميل');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/investment/${id}`);
      message.success('تم الحذف بنجاح');
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل الحذف');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <WarningOutlined className="text-2xl text-red-500" />
          <h1 className="text-2xl font-bold text-[#1e3a5f]">
            التصعيدات
            {data.length > 0 && <Badge count={data.length} className="mr-3" />}
          </h1>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>تحديث</Button>
      </div>

      {data.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          <WarningOutlined className="ml-2" />
          يوجد <strong>{data.length}</strong> طلب يحتاج تدخل فوري
        </div>
      )}

      {error  && <Alert type="error" message={error} />}
      {loading && <div className="text-center py-12"><Spin size="large" /></div>}

      <Card className="shadow-sm">
        <EscalationList
          data={data}
          loading={loading}
          onRefresh={fetchData}
          onDelete={handleDelete}
          onOpen={setSelected}
        />
      </Card>

      <Modal
        open={!!selected}
        onCancel={() => setSelected(null)}
        title={<span className="text-[#1e3a5f] font-bold">تفاصيل التصعيد: {selected?.processInstanceId}</span>}
        width={820}
        footer={null}
      >
        {selected && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <Tag color={selected.retryExhausted ? 'purple' : 'red'}>
                {selected.retryExhausted ? 'استنفاد المحاولات' : 'تجاوز الميعاد'}
              </Tag>
              <Tag color={selected.slaBreached ? 'red' : 'orange'}>
                {selected.slaBreached ? 'تم تسجيل تجاوز الميعاد' : 'متأخر عن الميعاد'}
              </Tag>
            </div>

            <Descriptions bordered column={2} size="small" className="mb-4">
              <Item label="المستثمر">{selected.investor?.fullName || '—'}</Item>
              <Item label="الرقم القومي"><span dir="ltr">{selected.investor?.nationalId || '—'}</span></Item>
              <Item label="البريد الإلكتروني"><span dir="ltr">{selected.investor?.email || '—'}</span></Item>
              <Item label="الهاتف"><span dir="ltr">{selected.investor?.phone || '—'}</span></Item>
              <Item label="الشركة">{selected.company?.name || '—'}</Item>
              <Item label="الشكل القانوني">{selected.company?.type || '—'}</Item>
              <Item label="النشاط">{selected.company?.activity || '—'}</Item>
              <Item label="العنوان">{selected.company?.address || '—'}</Item>
              <Item label="رأس المال">
                <strong>{selected.investment?.amount ? `${Number(selected.investment.amount).toLocaleString('ar-EG')} جنيه` : '—'}</strong>
              </Item>
              <Item label="المخاطرة">{selected.riskLevel || '—'}</Item>
              <Item label="المرحلة الحالية">{selected.currentStage || '—'}</Item>
              <Item label="الميعاد النهائي">{selected.slaDeadline ? new Date(selected.slaDeadline).toLocaleString('ar-EG') : '—'}</Item>
              <Item label="التحقق الوطني">{selected.verificationStatus?.nationalId || '—'}</Item>
              <Item label="التحقق الضريبي">{selected.verificationStatus?.taxClearance || '—'}</Item>
            </Descriptions>

            <div className="mb-4">
              <div className="text-sm font-semibold text-[#1e3a5f] mb-2">سبب الرفض إن وجد</div>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="اكتب سبب الرفض هنا"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-[#1e3a5f]"
              />
            </div>

            <Divider>آخر سجل في التاريخ</Divider>

            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 mb-4 max-h-44 overflow-auto">
              {(selected.history || []).slice().reverse().map((entry, index) => (
                <div key={`${entry.stage}-${index}`} className="mb-2 last:mb-0">
                  <div className="font-semibold text-[#1e3a5f]">{entry.stage}</div>
                  <div>{entry.note || '—'}</div>
                  <div className="text-xs text-gray-400">
                    {entry.actor || 'System'} · {entry.timestamp ? new Date(entry.timestamp).toLocaleString('ar-EG') : '—'}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <Button onClick={() => setSelected(null)}>إغلاق</Button>
              <Button style={{ background: '#16a34a', color: '#fff', borderColor: '#16a34a' }} onClick={() => decideEscalation(selected.processInstanceId, 'APPROVED')}>
                موافقة
              </Button>
              <Button danger onClick={() => decideEscalation(selected.processInstanceId, 'REJECTED', { reason })}>
                رفض
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default EscalationsPage;
