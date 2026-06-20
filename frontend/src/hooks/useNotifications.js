import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

export const useNotifications = (processInstanceId, enabled = true) => {
  const [notifications, setNotifications] = useState([]);
  const [unread,        setUnread]        = useState(0);
  const intervalRef = useRef(null);

  const fetchNotifications = async () => {
    if (!enabled) return;
    try {
      // If processInstanceId is provided, fetch for that specific investment
      const endpoint = processInstanceId 
        ? `/investment/status/${processInstanceId}`
        : `/investment/notifications`;
      
      const res = await api.get(endpoint);
      
      // Handle both endpoints: status/:id returns request, notifications returns { notifications }
      const notifs = processInstanceId 
        ? (res.data?.notifications || [])
        : (res.data?.notifications || []);
      
      setNotifications(notifs);
      setUnread(notifs.filter((n) => n.status !== 'READ' && !n.deletedAt).length);
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (!enabled) return undefined;
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, 10_000);
    return () => clearInterval(intervalRef.current);
  }, [processInstanceId, enabled]);

  const markNotificationRead = async (notificationId) => {
    await api.patch(`/investment/notifications/${notificationId}/read`);
    await fetchNotifications();
  };

  const deleteNotification = async (notificationId) => {
    await api.delete(`/investment/notifications/${notificationId}`);
    await fetchNotifications();
  };

  const markAllRead = () => setUnread(0);

  return { notifications, unread, markAllRead, markNotificationRead, deleteNotification, refreshNotifications: fetchNotifications };
};
