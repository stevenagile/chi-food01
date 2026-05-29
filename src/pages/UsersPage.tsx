import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, User as UserIcon, Trash2 } from 'lucide-react';
import AdminNav from '@/components/AdminNav';

interface RoleRow {
  id: string;
  user_id: string;
  role: string;
}
interface ProfileRow {
  id: string;
  display_name: string;
}

type Combined = {
  user_id: string;
  display_name: string;
  roles: string[];
};

const UsersPage = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Combined[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from('profiles').select('id, display_name'),
      supabase.from('user_roles').select('id, user_id, role'),
    ]);

    const profileList = (profiles ?? []) as ProfileRow[];
    const roleList = (roles ?? []) as RoleRow[];

    const map = new Map<string, Combined>();
    profileList.forEach((p) => {
      map.set(p.id, { user_id: p.id, display_name: p.display_name || '(未命名)', roles: [] });
    });
    roleList.forEach((r) => {
      const existing = map.get(r.user_id) ?? {
        user_id: r.user_id,
        display_name: '(無 profile)',
        roles: [],
      };
      existing.roles.push(r.role);
      map.set(r.user_id, existing);
    });

    setRows(Array.from(map.values()).sort((a, b) => a.display_name.localeCompare(b.display_name)));
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const setRole = async (user_id: string, newRole: 'admin' | 'staff' | 'none') => {
    // 先刪除既有角色
    await supabase.from('user_roles').delete().eq('user_id', user_id);
    if (newRole !== 'none') {
      const { error } = await supabase.from('user_roles').insert({ user_id, role: newRole });
      if (error) {
        toast({ title: '失敗', description: error.message, variant: 'destructive' });
        return;
      }
    }
    toast({ title: '已更新角色' });
    fetchAll();
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="bg-dark-wood text-dark-wood-foreground px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-lg font-serif-tc font-bold text-gold whitespace-nowrap w-[160px] shrink-0">使用者管理</h1>
          <AdminNav />
        </div>
      </div>

      <div className="p-4 max-w-3xl mx-auto space-y-4">
        <div className="bg-card border border-border rounded-2xl p-4 text-sm text-muted-foreground space-y-1">
          <p><Shield size={14} className="inline mr-1 text-primary" /><b className="text-foreground">最高管理者</b>：POS、出餐、庫存（含修改）、帳務、報表、使用者管理</p>
          <p><UserIcon size={14} className="inline mr-1" /><b className="text-foreground">工作人員</b>：POS、出餐、庫存（僅查看）</p>
          <p className="text-xs pt-2">新成員請先到登入頁註冊，再回此頁指派角色。未指派角色的帳號無法進入後台。</p>
        </div>

        {loading ? (
          <p className="text-center py-8 text-muted-foreground text-sm">載入中…</p>
        ) : rows.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground text-sm">目前沒有任何帳號。</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const current = r.roles.includes('admin') ? 'admin' : r.roles.includes('staff') ? 'staff' : 'none';
              return (
                <div key={r.user_id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-medium text-foreground flex items-center gap-2">
                      {current === 'admin' ? <Shield size={16} className="text-primary" /> : <UserIcon size={16} className="text-muted-foreground" />}
                      {r.display_name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{r.user_id}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={current}
                      onChange={(e) => setRole(r.user_id, e.target.value as 'admin' | 'staff' | 'none')}
                      className="px-3 py-2 rounded-xl border border-border bg-background text-sm"
                    >
                      <option value="admin">最高管理者</option>
                      <option value="staff">工作人員</option>
                      <option value="none">無權限</option>
                    </select>
                    {current !== 'none' && (
                      <button
                        onClick={() => setRole(r.user_id, 'none')}
                        title="移除權限"
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersPage;
