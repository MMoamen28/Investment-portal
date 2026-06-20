import { useEffect, useState } from 'react';
import { Card, Spin, Alert } from 'antd';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import StatsCards from '../../components/manager/StatsCards';
import api from '../../services/api';

const RISK_COLORS = { LOW: '#16a34a', MEDIUM: '#d97706', HIGH: '#dc2626' };
const STATUS_COLORS = { APPROVED: '#16a34a', REJECTED: '#dc2626', IN_PROGRESS: '#1e3a5f', ESCALATED: '#d97706', MISSING_DATA: '#9333ea' };
const STATUS_AR = { APPROVED: 'موافق', REJECTED: 'مرفوض', IN_PROGRESS: 'قيد المعالجة', ESCALATED: 'مُصعَّد', MISSING_DATA: 'ناقص' };
const RISK_AR = { LOW: 'منخفض', MEDIUM: 'متوسط', HIGH: 'مرتفع' };

const DashboardPage = () => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/investment/dashboard/stats');
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'فشل تحميل البيانات');
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="text-center py-16"><Spin size="large" /></div>;
  if (error)   return <Alert type="error" message={error} />;

  const byRisk   = (data?.byRisk   || []).map((d) => ({ name: RISK_AR[d._id] || d._id, value: d.count, color: RISK_COLORS[d._id] || '#999' }));
  const byStatus = (data?.byStatus || []).map((d) => ({ name: STATUS_AR[d._id] || d._id, value: d.count, fill: STATUS_COLORS[d._id] || '#999' }));
  const daily    = (data?.dailySubmissions || []).map((d) => ({ date: d._id, طلبات: d.count }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1e3a5f]">لوحة التحكم</h1>

      <StatsCards stats={data?.stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart - by risk */}
        <Card title="الطلبات حسب مستوى المخاطرة" className="shadow-sm">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byRisk}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" name="عدد الطلبات">
                {byRisk.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Pie chart - by status */}
        <Card title="توزيع الحالات" className="shadow-sm">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                {byStatus.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Line chart - daily */}
        <Card title="الطلبات اليومية (7 أيام)" className="shadow-sm lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="طلبات" stroke="#1e3a5f" strokeWidth={2} dot={{ fill: '#c9a84c' }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
