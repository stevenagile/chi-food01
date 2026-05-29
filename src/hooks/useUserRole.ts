import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AppRole = 'admin' | 'staff' | null;

/**
 * 讀取目前登入者的角色。
 * - admin：最高管理者（可看帳務、報表、修改庫存/配方）
 * - staff：一般工作人員（POS、KDS、查看庫存）
 * - null：未登入或無任何角色
 */
export const useUserRole = () => {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      if (cancelled) return;
      const roles = (data ?? []).map((r) => r.role);
      if (roles.includes('admin')) setRole('admin');
      else if (roles.includes('staff')) setRole('staff');
      else setRole(null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return {
    role,
    loading,
    isAdmin: role === 'admin',
    isStaff: role === 'staff' || role === 'admin', // admin 也算 staff（向下相容）
  };
};
