import { useEffect, useState } from 'react';
import { Card, Input, Select, DatePicker, Button, Alert } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import RequestsTable from '../../components/manager/RequestsTable';
import api from '../../services/api';
import { message } from 'antd';

const { RangePicker } = DatePicker;

const RequestsPage = () => {
  const [data,       setData]       = useState([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [filters,    setFilters]    = useState({ status: '', riskLevel: '', investorName: '' });
  const [dateRange,  setDateRange]  = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  const fetchData = async (page = 1) => {
    setLoading(true); setError(null);
    try {
      const params = { page, limit: pagination.pageSize, ...filters };
      if (dateRange[0]) params.startDate = dateRange[0].toISOString();
      if (dateRange[1]) params.endDate   = dateRange[1].toISOString();
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);

      const res = await api.get('/investment/all', { params });
      setData(res.data.requests);
      setTotal(res.data.total);
      setPagination((p) => ({ ...p, current: page, total: res.data.total }));
    } catch (err) {
      setError(err.response?.data?.message || 'فشل التحميل');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(1); }, []);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/investment/${id}`);
      message.success('تم الحذف بنجاح');
      fetchData(pagination.current);
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل الحذف');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">جميع الطلبات</h1>
        <Button icon={<ReloadOutlined />} onClick={() => fetchData(pagination.current)}>تحديث</Button>
      </div>

      {/* Filters */}
      <Card size="small" className="shadow-sm">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="اسم المستثمر"
            prefix={<SearchOutlined />}
            value={filters.investorName}
            onChange={(e) => setFilters((f) => ({ ...f, investorName: e.target.value }))}
            className="w-44"
          />
          <Select
            placeholder="الحالة"
            allowClear
            value={filters.status || undefined}
            onChange={(v) => setFilters((f) => ({ ...f, status: v || '' }))}
            className="w-40"
            options={[
              { value: 'IN_PROGRESS',  label: 'قيد المعالجة' },
              { value: 'APPROVED',     label: 'موافق عليه'   },
              { value: 'REJECTED',     label: 'مرفوض'        },
              { value: 'MISSING_DATA', label: 'بيانات ناقصة' },
            ]}
          />
          <Select
            placeholder="المخاطرة"
            allowClear
            value={filters.riskLevel || undefined}
            onChange={(v) => setFilters((f) => ({ ...f, riskLevel: v || '' }))}
            className="w-32"
            options={[
              { value: 'LOW',    label: 'منخفض' },
              { value: 'MEDIUM', label: 'متوسط' },
              { value: 'HIGH',   label: 'مرتفع' },
            ]}
          />
          <RangePicker
            onChange={(dates) => setDateRange(dates || [])}
            placeholder={['من', 'إلى']}
          />
          <Button type="primary" style={{ background: '#1e3a5f' }} onClick={() => fetchData(1)}>
            بحث
          </Button>
        </div>
      </Card>

      {error && <Alert type="error" message={error} />}

      <Card className="shadow-sm">
        <RequestsTable
          data={data}
          loading={loading}
          pagination={{ ...pagination, total, showSizeChanger: false }}
          onChange={(pag) => fetchData(pag.current)}
          onDelete={handleDelete}
        />
        <div className="text-xs text-gray-400 mt-2">إجمالي: {total} طلب</div>
      </Card>
    </div>
  );
};

export default RequestsPage;
