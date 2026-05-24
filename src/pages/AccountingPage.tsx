import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Search, Download, DollarSign, ShoppingBag, TrendingUp, Calendar } from 'lucide-react';
import AdminNav from '@/components/AdminNav';
import type { Order } from '@/data/menu';

const mapRow = (row: any): Order => ({
  id: row.id,
  type: row.type,
  tableNumber: row.table_number ?? undefined,
  items: (row.items as any[]) ?? [],
  total: row.total,
  status: row.status,
  createdAt: new Date(row.created_at),
  customerName: row.customer_name ?? undefined,
  customerPhone: row.customer_phone ?? undefined,
  paymentStatus: row.payment_status ?? '未付款',
  paymentMethod: row.payment_method ?? null,
  paidAt: row.paid_at ? new Date(row.paid_at) : null,
  guestCount: row.guest_count ?? null,
  cookingAt: row.cooking_at ? new Date(row.cooking_at) : null,
  completedAt: row.completed_at ? new Date(row.completed_at) : null,
});

const todayStr = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

const AccountingPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<string>(todayStr());
  const [dateTo, setDateTo] = useState<string>(todayStr());
  const [typeFilter, setTypeFilter] = useState<string>('全部');
  const [payFilter, setPayFilter] = useState<string>('全部');
  const [keyword, setKeyword] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const from = new Date(dateFrom + 'T00:00:00');
    const to = new Date(dateTo + 'T23:59:59');
    const { data } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString())
      .order('created_at', { ascending: false });
    setOrders((data ?? []).map(mapRow));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [dateFrom, dateTo]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (typeFilter !== '全部' && o.type !== typeFilter) return false;
      if (payFilter !== '全部' && o.paymentStatus !== payFilter) return false;
      if (keyword) {
        const k = keyword.toLowerCase();
        const inItems = o.items.some((i) => i.menuItem.name.toLowerCase().includes(k));
        const inMeta = (o.tableNumber ?? '').includes(k) || o.id.toLowerCase().includes(k) || (o.customerName ?? '').toLowerCase().includes(k);
        if (!inItems && !inMeta) return false;
      }
      return true;
    });
  }, [orders, typeFilter, payFilter, keyword]);

  const stats = useMemo(() => {
    const paid = filtered.filter((o) => o.paymentStatus === '已付款' && o.status !== '已取消');
    const revenue = paid.reduce((s, o) => s + o.total, 0);
    const orderCount = paid.length;
    const itemCount = paid.reduce((s, o) => s + o.items.reduce((a, i) => a + i.quantity, 0), 0);
    const avg = orderCount ? Math.round(revenue / orderCount) : 0;
    const byMethod: Record<string, number> = {};
    const byType: Record<string, number> = {};
    paid.forEach((o) => {
      const m = o.paymentMethod || '未指定';
      byMethod[m] = (byMethod[m] || 0) + o.total;
      byType[o.type] = (byType[o.type] || 0) + o.total;
    });
    return { revenue, orderCount, itemCount, avg, byMethod, byType };
  }, [filtered]);

  const exportCSV = () => {
    const rows = [
      ['訂單編號', '時間', '類型', '桌號', '品項', '金額', '付款狀態', '付款方式', '訂單狀態'],
      ...filtered.map((o) => [
        o.id,
        new Date(o.createdAt).toLocaleString('zh-TW'),
        o.type,
        o.tableNumber ?? '',
        o.items.map((i) => `${i.menuItem.name}×${i.quantity}`).join('；'),
        o.total,
        o.paymentStatus,
        o.paymentMethod ?? '',
        o.status,
      ]),
    ];
    const csv = '\ufeff' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `帳務明細_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-dark-wood text-dark-wood-foreground px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-lg font-serif-tc font-bold text-gold whitespace-nowrap w-[160px] shrink-0">帳務管理</h1>
          <AdminNav />
        </div>
        <button onClick={exportCSV} className="px-3 py-2 bg-gold/20 text-gold rounded-xl flex items-center gap-1.5 text-sm font-bold">
          <Download size={16} /> 匯出 CSV
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign size={12}/>總營收</div>
            <div className="text-2xl font-bold text-primary mt-1">${stats.revenue}</div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><ShoppingBag size={12}/>訂單數</div>
            <div className="text-2xl font-bold text-foreground mt-1">{stats.orderCount}</div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp size={12}/>客單均價</div>
            <div className="text-2xl font-bold text-foreground mt-1">${stats.avg}</div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="text-xs text-muted-foreground">出餐份數</div>
            <div className="text-2xl font-bold text-foreground mt-1">{stats.itemCount}</div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="grid md:grid-cols-2 gap-3">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="text-sm font-bold mb-2 text-foreground">付款方式</div>
            {Object.keys(stats.byMethod).length === 0 ? (
              <div className="text-xs text-muted-foreground">尚無資料</div>
            ) : Object.entries(stats.byMethod).map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm py-1">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium">${v}</span>
              </div>
            ))}
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="text-sm font-bold mb-2 text-foreground">訂單類型</div>
            {Object.keys(stats.byType).length === 0 ? (
              <div className="text-xs text-muted-foreground">尚無資料</div>
            ) : Object.entries(stats.byType).map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm py-1">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium">${v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar size={12}/>起</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-background border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">迄</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-background border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">類型</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-background border border-border rounded-lg px-3 py-2 text-sm">
              {['全部', '內用', '外帶', '外送'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">付款</label>
            <select value={payFilter} onChange={(e) => setPayFilter(e.target.value)} className="bg-background border border-border rounded-lg px-3 py-2 text-sm">
              {['全部', '已付款', '未付款'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-muted-foreground flex items-center gap-1"><Search size={12}/>搜尋（品項/桌號/編號）</label>
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="關鍵字" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">時間</th>
                  <th className="text-left px-3 py-2 font-medium">類型</th>
                  <th className="text-left px-3 py-2 font-medium">桌號</th>
                  <th className="text-left px-3 py-2 font-medium">品項</th>
                  <th className="text-right px-3 py-2 font-medium">金額</th>
                  <th className="text-left px-3 py-2 font-medium">付款</th>
                  <th className="text-left px-3 py-2 font-medium">狀態</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">載入中…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">查無資料</td></tr>
                ) : filtered.map((o) => (
                  <tr key={o.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(o.createdAt).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-3 py-2">{o.type}</td>
                    <td className="px-3 py-2">{o.tableNumber ?? '-'}</td>
                    <td className="px-3 py-2 max-w-[300px]">
                      <div className="truncate" title={o.items.map((i) => `${i.menuItem.name}×${i.quantity}`).join('、')}>
                        {o.items.map((i) => `${i.menuItem.name}×${i.quantity}`).join('、')}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-primary">${o.total}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${o.paymentStatus === '已付款' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>
                        {o.paymentStatus}{o.paymentMethod ? ` · ${o.paymentMethod}` : ''}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-muted-foreground">{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingPage;
