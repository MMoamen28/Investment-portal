import { useEffect, useState } from 'react';
import { Alert, Spin, Select, Input, Empty, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import TaskCard from '../../components/employee/TaskCard';
import TaskDetailModal from '../../components/employee/TaskDetailModal';
import useAuthStore from '../../store/useAuthStore';
import { useTasks } from '../../hooks/useTasks';
import api from '../../services/api';

const TasksPage = () => {
  const { user } = useAuthStore();
  const { tasks, loading, error, fetchTasks, claimTask, completeTask, getTaskDetails } = useTasks();
  const [search,      setSearch]      = useState('');
  const [statusFilter,setStatusFilter]= useState('');
  const [modalOpen,   setModalOpen]   = useState(false);
  const [selected,    setSelected]    = useState(null);
  const [detailData,  setDetailData]  = useState(null);

  useEffect(() => {
    fetchTasks(user?.approvalGroup, statusFilter);
  }, [user, statusFilter]);

  const handleClaim = async (taskId) => {
    try {
      await claimTask(taskId);
      message.success('تم حجز المهمة بنجاح');
      fetchTasks(user?.approvalGroup);
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل حجز المهمة');
    }
  };

  const handleView = async (task) => {
    setSelected(task);
    try {
      const d = await getTaskDetails(task.taskId);
      setDetailData(d);
    } catch { setDetailData({ task, request: null }); }
    setModalOpen(true);
  };

  const handleComplete = async (taskId, payload) => {
    await completeTask(taskId, payload);
    fetchTasks(user?.approvalGroup);
  };

  const filtered = tasks.filter((t) => {
    if (t.slaBreached || t.status === 'ESCALATED') return false;
    const matchSearch = !search || t.investorName?.includes(search) || t.taskId?.includes(search);
    const matchStatus = !statusFilter || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">مهامي</h1>
          <p className="text-gray-500 text-sm">مجموعة الموافقة: <strong>{user?.approvalGroup || 'جميع'}</strong></p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="بحث باسم المستثمر أو رقم المهمة"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-52"
          />
          <Select
            placeholder="الحالة"
            allowClear
            value={statusFilter || undefined}
            onChange={(v) => setStatusFilter(v || '')}
            options={[
              { value: 'AVAILABLE', label: 'متاحة' },
              { value: 'CLAIMED',   label: 'محجوزة' },
              { value: 'COMPLETED', label: 'مكتملة' },
            ]}
            className="w-28"
          />
        </div>
      </div>

      {error  && <Alert type="error" message={error} className="mb-4" />}
      {loading && <div className="text-center py-12"><Spin size="large" /></div>}

      {!loading && filtered.length === 0 && (
        <Empty description="لا توجد مهام حالياً" className="py-16" />
      )}

      <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
        {filtered.map((task) => (
          <TaskCard
            key={task.taskId}
            task={task}
            currentUser={user?.username}
            onClaim={handleClaim}
            onView={handleView}
          />
        ))}
      </div>

      <TaskDetailModal
        open={modalOpen}
        task={detailData?.task || selected}
        request={detailData?.request}
        onClose={() => setModalOpen(false)}
        onComplete={handleComplete}
      />
    </div>
  );
};

export default TasksPage;
