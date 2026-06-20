import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

export const useNotifications = (processInstanceId) => {
  const [notifications, setNotifications] = useState([]);
  const [unread,        setUnread]        = useState(0);
  const intervalRef = useRef(null);

  const fetchNotifications = async () => {
    if (!processInstanceId) return;
    try {
      const res = await api.get(`/investment/status/${processInstanceId}`);
      const notifs = res.data?.notifications || [];
      setNotifications(notifs);
      setUnread(notifs.filter((n) => n.status === 'SENT').length);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, 10_000);
    return () => clearInterval(intervalRef.current);
  }, [processInstanceId]);

  const markAllRead = () => setUnread(0);

  return { notifications, unread, markAllRead };
};
