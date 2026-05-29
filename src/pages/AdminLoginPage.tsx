import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { UtensilsCrossed, LogIn, LogOut, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, signIn, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const err = (location.state as { error?: string } | null)?.error;
    if (err) {
      toast({ title: '無法進入後台', description: err, variant: 'destructive' });
      window.history.replaceState({}, document.title);
    }
  }, [location.state, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      toast({ title: '登入失敗', description: error.message, variant: 'destructive' });
    } else {
      navigate('/admin/pos');
    }
    setLoading(false);
  };

  const handleSwitchAccount = async () => {
    setLoading(true);
    await signOut();
    setLoading(false);
    toast({ title: '已登出', description: '請輸入要切換的帳號' });
  };

  return (
    <div className="min-h-screen bg-dark-wood flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-gold flex items-center justify-center shadow-warm">
            <UtensilsCrossed size={28} className="text-gold-foreground" />
          </div>
          <h1 className="text-2xl font-serif-tc font-bold text-gold">後台管理</h1>
          <p className="text-dark-wood-foreground/60 text-sm mt-1">虎秋文昌雞</p>
        </div>

        {authLoading ? (
          <div className="bg-card rounded-2xl p-6 shadow-warm text-center text-sm text-muted-foreground">
            載入中…
          </div>
        ) : user ? (
          <div className="bg-card rounded-2xl p-6 shadow-warm space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">目前登入</p>
              <p className="font-medium text-foreground mt-1 break-all">{user.email}</p>
            </div>
            <button
              onClick={() => navigate('/admin/pos')}
              className="w-full py-3 bg-gradient-red text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              進入後台 <ArrowRight size={18} />
            </button>
            <button
              onClick={handleSwitchAccount}
              disabled={loading}
              className="w-full py-2.5 border border-border text-foreground text-sm rounded-xl hover:bg-muted transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <LogOut size={16} /> 登出 / 切換帳號
            </button>
          </div>
        ) : (
          <div className="bg-card rounded-2xl p-6 shadow-warm">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">電子郵件</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="admin@example.com"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">密碼</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="至少6個字元"
                  minLength={6}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-red text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><LogIn size={18} /> 登入</>
                )}
              </button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AdminLoginPage;
