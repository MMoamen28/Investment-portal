import { useEffect, useState } from 'react';
import { Card, Button, Alert } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import RequestsTable from '../../components/manager/RequestsTable';
import { useInvestment } from '../../hooks/useInvestment';

const MyRequestsPage = () => {
  const [data,       setData]       = useState([]);
  const [total,      setTotal]      = useState(0);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  
  const { loading, error, getMyRequests } = useInvestment();

  const fetchData = async (page = 1) => {
    try {
      const res = await getMyRequests(page, pagination.pageSize);
      setData(res.requests);
      setTotal(res.total);
      setPagination((p) => ({ ...p, current: page, total: res.total }));
    } catch (err) {
      // Error handled by hook
    }
  };

  useEffect(() => { fetchData(1); }, []);

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">طلباتي</h1>
        <Button icon={<ReloadOutlined />} onClick={() => fetchData(pagination.current)}>تحديث</Button>
      </div>

      {error && <Alert type="error" message={error} className="mb-4" />}

      <Card className="shadow-sm">
        <RequestsTable
          data={data}
          loading={loading}
          pagination={{ ...pagination, total, showSizeChanger: false }}
          onChange={(pag) => fetchData(pag.current)}
        />
        <div className="text-xs text-gray-400 mt-2">إجمالي: {total} طلب</div>
      </Card>
    </div>
  );
};

export default MyRequestsPage;
