import { useEffect, useState } from 'react';
import { Card, Alert, Spin, Button, Badge } from 'antd';
import { WarningOutlined, ReloadOutlined } from '@ant-design/icons';
import EscalationList from '../../components/manager/EscalationList';
import api from '../../services/api';

const EscalationsPage = () => {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

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
        <EscalationList data={data} loading={loading} onRefresh={fetchData} />
      </Card>
    </div>
  );
};

export default EscalationsPage;
