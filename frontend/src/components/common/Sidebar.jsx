import { NavLink } from 'react-router-dom';
import {
  DashboardOutlined, FileAddOutlined, SearchOutlined,
  CheckSquareOutlined, WarningOutlined, UnorderedListOutlined, FormOutlined,
} from '@ant-design/icons';
import useAuthStore from '../../store/useAuthStore';

const NAV = {
  INVESTOR: [
    { to: '/investor/submit',       icon: <FileAddOutlined />,    label: 'تقديم طلب' },
    { to: '/investor/status',       icon: <SearchOutlined />,     label: 'تتبع الطلب' },
    { to: '/investor/my-requests',  icon: <UnorderedListOutlined />, label: 'طلباتي' },
  ],
  EMPLOYEE: [
    { to: '/employee/tasks',        icon: <CheckSquareOutlined />, label: 'مهامي' },
    { to: '/employee/missing-data', icon: <FormOutlined />,        label: 'بيانات ناقصة' },
  ],
  MANAGER: [
    { to: '/manager/dashboard',   icon: <DashboardOutlined />,    label: 'لوحة التحكم'   },
    { to: '/manager/requests',    icon: <UnorderedListOutlined />, label: 'جميع الطلبات'  },
    { to: '/manager/escalations', icon: <WarningOutlined />,       label: 'التصعيدات'     },
  ],
};

const Sidebar = () => {
  const { user } = useAuthStore();
  const links = NAV[user?.role] || [];

  return (
    <aside className="w-56 min-h-screen bg-white border-l border-gray-200 shadow-sm flex-shrink-0">
      <nav className="pt-4">
        {links.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#1e3a5f] text-white border-r-4 border-[#c9a84c]'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-[#1e3a5f]'
              }`
            }
          >
            <span className="text-lg">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
