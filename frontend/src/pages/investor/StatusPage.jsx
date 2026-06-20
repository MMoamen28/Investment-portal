import { useState, useEffect } from 'react';
import { Card, Input, Button, Alert, Spin, Progress, Tag, Timeline, Empty } from 'antd';
import { SearchOutlined, BellOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import VerificationStatus from '../../components/investor/VerificationStatus';
import StatusStepper from '../../components/common/StatusStepper';
import RiskBadge from '../../components/common/RiskBadge';
import SLATimer from '../../components/common/SLATimer';
import RetryIndicator from '../../components/common/RetryIndicator';
import { useInvestment } from '../../hooks/useInvestment';

const STATUS_LABELS = {
  IN_PROGRESS: { label: 'قيد المعالجة', color: 'processing' },
  APPROVED:    { label: 'موافق عليه',    color: 'success' },
  REJECTED:    { label: 'مرفوض',         color: 'error' },
  ESCALATED:   { label: 'مُصعَّد',        color: 'warning' },
  MISSING_DATA:{ label: 'بيانات ناقصة',  color: 'orange' },
};

const StatusPage = () => {
  const [searchParams] = useSearchParams();
  const [id,      setId]      = useState(searchParams.get('id') || '');
  const [data,    setData]    = useState(null);
  const { loading, error, getStatus } = useInvestment();

  const fetch = async (processId) => {
    if (!processId?.trim()) return;
    try {
      const res = await getStatus(processId.trim());
      setData(res);
    } catch { /* error shown by hook */ }
  };

  useEffect(() => {
    if (id) fetch(id);
  }, []);

  // Auto-refresh every 10s
  useEffect(() => {
    if (!id) return;
    const t = setInterval(() => fetch(id), 10_000);
    return () => clearInterval(t);
  }, [id]);

  const approvalPct = data ? Math.round((data.approvalsReceived / (data.approvalsRequired || 1)) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Card className="shadow-sm">
        <h2 className="text-[#1e3a5f] font-bold text-lg mb-4">تتبع حالة الطلب</h2>
        <div className="flex gap-2">
          <Input
            size="large"
            placeholder="أدخل رقم الطلب (مثال: INV-...)"
            value={id}
            onChange={(e) => setId(e.target.value)}
            onPressEnter={() => fetch(id)}
            prefix={<SearchOutlined />}
            dir="ltr"
          />
          <Button type="primary" size="large" loading={loading} onClick={() => fetch(id)} style={{ background: '#1e3a5f' }}>
            بحث
          </Button>
        </div>
      </Card>

      {error && <Alert type="error" message={error} />}
      {loading && !data && <div className="text-center py-8"><Spin size="large" /></div>}

      {data && (
        <>
          {/* Status Header */}
          <Card className="shadow-sm">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Tag color={STATUS_LABELS[data.status]?.color} className="text-sm px-3 py-1">
                {STATUS_LABELS[data.status]?.label || data.status}
              </Tag>
              <RiskBadge level={data.riskLevel} />
              <SLATimer deadline={data.slaDeadline} breached={data.slaBreached} status={data.status} />
              <RetryIndicator retryCount={data.retryCount} retryExhausted={data.retryExhausted} />
              {data.slaBreached && (
                <Tag color="red">تم التصعيد</Tag>
              )}
            </div>
            <StatusStepper currentStage={data.currentStage} status={data.status} />
          </Card>

          {/* Verification */}
          <Card className="shadow-sm">
            <VerificationStatus verificationStatus={data.verificationStatus} />
          </Card>

          {/* Approvals */}
          {data.approvalsRequired > 0 && (
            <Card className="shadow-sm" title="تقدم الموافقات">
              <div className="flex items-center gap-4">
                <Progress
                  percent={approvalPct}
                  format={() => `${data.approvalsReceived}/${data.approvalsRequired}`}
                  strokeColor="#1e3a5f"
                  className="flex-1"
                />
                <span className="text-sm text-gray-500">
                  {data.approvalsReceived} من أصل {data.approvalsRequired} موافقات
                </span>
              </div>
            </Card>
          )}

          {/* History */}
          <Card className="shadow-sm" title="سجل المراحل">
            {data.history?.length > 0 ? (
              <Timeline
                items={[...data.history].reverse().map((h) => ({
                  color: 'blue',
                  children: (
                    <div>
                      <div className="font-semibold text-sm text-[#1e3a5f]">{h.stage}</div>
                      <div className="text-xs text-gray-500">{new Date(h.timestamp).toLocaleString('ar-EG')}</div>
                      <div className="text-sm text-gray-700 mt-0.5">{h.note}</div>
                      {h.actor && <div className="text-xs text-gray-400">بواسطة: {h.actor}</div>}
                    </div>
                  ),
                }))}
              />
            ) : (
              <Empty description="لا يوجد سجل بعد" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>

          {/* Notifications */}
          {data.notifications?.length > 0 && (
            <Card className="shadow-sm" title={<><BellOutlined className="ml-2" />الإشعارات</>}>
              <div className="space-y-2">
                {[...data.notifications].reverse().map((n, i) => (
                  <div key={i} className="flex flex-col p-3 bg-gray-50 rounded border border-gray-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-[#1e3a5f] text-sm">رسالة عبر {n.channel === 'SMS' ? 'الجوال (SMS)' : 'البريد الإلكتروني'}</span>
                      <span className="text-gray-400 text-xs">{new Date(n.sentAt).toLocaleString('ar-EG')}</span>
                    </div>
                    <div className="text-gray-700 text-sm">
                      {n.message || (n.type === 'APPROVAL' ? 'تمت الموافقة' : n.type === 'REJECTION' ? 'تم الرفض' : n.type)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default StatusPage;
