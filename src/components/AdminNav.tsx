import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutGrid, ShoppingBag, Package, QrCode, BookOpen, Wallet, BarChart3 } from 'lucide-react';

const tabs = [
  { path: '/admin', label: '看板', icon: LayoutGrid },
  { path: '/admin/pos', label: 'POS', icon: ShoppingBag },
  { path: '/admin/inventory', label: '庫存管理', icon: Package },
  { path: '/admin/reports', label: '報表', icon: BarChart3 },
  { path: '/admin/qr-codes', label: 'QR Code', icon: QrCode },
  { path: '/admin/manual', label: '手冊', icon: BookOpen },
  { path: '/admin/accounting', label: '帳務', icon: Wallet },
];

const AdminNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {tabs.map(({ path, label, icon: Icon }) => {
        const active = location.pathname === path;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            title={label}
            className={`px-3 py-2 rounded-xl flex items-center gap-1.5 text-sm font-medium transition-colors ${
              active ? 'bg-gold/20 text-gold' : 'bg-white/10 text-dark-wood-foreground hover:bg-white/20'
            }`}
          >
            <Icon size={18} />
            <span className="hidden lg:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default AdminNav;
