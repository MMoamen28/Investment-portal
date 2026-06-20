import { useState, useCallback } from 'react';
import api from '../services/api';

export const useTasks = () => {
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const fetchTasks = useCallback(async (group, status) => {
    setLoading(true); setError(null);
    try {
      const params = {};
      if (group) params.group = group;
      if (status) params.status = status;
      const res = await api.get('/tasks', { params });
      setTasks(res.data);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    } finally { setLoading(false); }
  }, []);

  const claimTask = useCallback(async (taskId) => {
    const res = await api.post(`/tasks/${taskId}/claim`);
    return res.data;
  }, []);

  const completeTask = useCallback(async (taskId, payload) => {
    const res = await api.post(`/tasks/${taskId}/complete`, payload);
    return res.data;
  }, []);

  const getTaskDetails = useCallback(async (taskId) => {
    const res = await api.get(`/tasks/${taskId}/details`);
    return res.data;
  }, []);

  return { tasks, loading, error, fetchTasks, claimTask, completeTask, getTaskDetails };
};
