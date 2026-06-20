import { Link, useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { LogoutOutlined, HomeOutlined } from '@ant-design/icons';
import useAuthStore from '../../store/useAuthStore';
import NotificationBell from './NotificationBell';
import { useNotifications } from '../../hooks/useNotifications';

const ROLE_LABELS = { INVESTOR: 'مستثمر', EMPLOYEE: 'موظف', MANAGER: 'مدير' };

const HOME_PATHS = { INVESTOR: '/investor/submit', EMPLOYEE: '/employee/tasks', MANAGER: '/manager/dashboard' };

const Navbar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { notifications, unread, markAllRead } = useNotifications();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <header className="bg-[#1e3a5f] text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to={HOME_PATHS[user?.role] || '/'} className="flex items-center gap-3 text-white no-underline">
          <div className="w-9 h-9 rounded bg-[#c9a84c] flex items-center justify-center text-[#1e3a5f] font-bold text-lg">
            ب
          </div>
          <div className="leading-tight">
            <div className="font-bold text-sm">بوابة الاستثمار الحكومية</div>
            <div className="text-xs text-blue-200">جمهورية مصر العربية</div>
          </div>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user && (
            <>
              <span className="text-sm text-blue-200 hidden sm:block">
                {user.username} · <span className="text-[#c9a84c]">{ROLE_LABELS[user.role]}</span>
              </span>
              <NotificationBell notifications={notifications} unread={unread} onRead={markAllRead} />
              <Button
                onClick={handleLogout}
                icon={<LogoutOutlined />}
                className="border-white/40 text-white hover:border-white"
                ghost
                size="small"
              >
                خروج
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
