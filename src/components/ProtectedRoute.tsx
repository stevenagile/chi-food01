import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: React.ReactNode;
  /** 若為 true，僅 admin 可進入；否則 admin + staff 皆可。 */
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false }: Props) => {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  // 沒有任何角色（被踢出系統）
  useEffect(() => {
    if (!authLoading && !roleLoading && user && role === null) {
      supabase.auth.signOut();
    }
  }, [authLoading, roleLoading, user, role]);

  if (authLoading || (user && roleLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">載入中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (role === null) {
    return (
      <Navigate to="/admin/login" replace state={{ error: '此帳號沒有後台權限' }} />
    );
  }

  if (requireAdmin && role !== 'admin') {
    return (
      <Navigate to="/admin/pos" replace state={{ error: '此頁僅限最高管理者' }} />
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
