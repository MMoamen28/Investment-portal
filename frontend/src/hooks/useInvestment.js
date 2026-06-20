import { useState, useCallback } from 'react';
import api from '../services/api';

export const useInvestment = () => {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const startInvestment = useCallback(async (data) => {
    setLoading(true); setError(null);
    try {
      const res = await api.post('/investment/start', data);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
      throw err;
    } finally { setLoading(false); }
  }, []);

  const getStatus = useCallback(async (id) => {
    setLoading(true); setError(null);
    try {
      const res = await api.get(`/investment/status/${id}`);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
      throw err;
    } finally { setLoading(false); }
  }, []);

  const getMyRequests = useCallback(async (page = 1, limit = 20) => {
    setLoading(true); setError(null);
    try {
      const res = await api.get(`/investment/my-requests?page=${page}&limit=${limit}`);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
      throw err;
    } finally { setLoading(false); }
  }, []);

  const deleteInvestment = useCallback(async (id) => {
    setLoading(true); setError(null);
    try {
      const res = await api.delete(`/investment/${id}`);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء الحذف');
      throw err;
    } finally { setLoading(false); }
  }, []);

  return { loading, error, startInvestment, getStatus, getMyRequests, deleteInvestment };
};
