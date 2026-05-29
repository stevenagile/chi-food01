import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrderStore } from '@/store/useOrderStore';
import type { Order } from '@/data/menu';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, ShoppingBag, DollarSign, BarChart3, Calendar, Timer, RotateCcw, UtensilsCrossed, ArrowUpRight, ArrowDownRight, Minus, RefreshCcw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const COLORS = ['hsl(0,72%,42%)', 'hsl(38,80%,55%)', 'hsl(150,50%,40%)', 'hsl(210,60%,50%)', 'hsl(280,50%,50%)', 'hsl(30,70%,50%)'];

const ReportsPage = () => {
  const { orders, fetchOrders, archiveAllOrders, loading } = useOrderStore();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');
  const [closing, setClosing] = useState(false);

  const handleCloseDay = async () => {
    setClosing(true);
    try {
      await archiveAllOrders();
      await fetchOrders(true);
      toast.success('今日已結算並歸零');
    } catch (e) {
      toast.error('結算失敗，請稍後重試');
    } finally {
      setClosing(false);
    }
  };

  useEffect(() => {
    fetchOrders(true); // Include archived orders for reports
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredOrders = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return orders.filter((o) => {
      if (o.status === '已取消') return false;
      const d = new Date(o.createdAt);
      if (dateRange === 'today') return d >= startOfDay;
      if (dateRange === 'week') {
        const weekAgo = new Date(startOfDay);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return d >= weekAgo;
      }
      const monthAgo = new Date(startOfDay);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return d >= monthAgo;
    });
  }, [orders, dateRange]);

  const paidOrders = filteredOrders.filter(o => o.paymentStatus === '已付款');
  const totalRevenue = paidOrders.reduce((s, o) => s + o.total, 0);
  const totalOrders = filteredOrders.length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / (paidOrders.length || 1)) : 0;
  const pendingPayment = filteredOrders.filter(o => o.paymentStatus !== '已付款').reduce((s, o) => s + o.total, 0);

  // Product sales ranking
  const productSales = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    filteredOrders.forEach((order) => {
      order.items.forEach((item) => {
        const key = item.menuItem.id;
        if (!map[key]) map[key] = { name: item.menuItem.name, qty: 0, revenue: 0 };
        map[key].qty += item.quantity;
        map[key].revenue += item.menuItem.price * item.quantity;
      });
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 10);
  }, [filteredOrders]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOrders.forEach((order) => {
      order.items.forEach((item) => {
        const cat = item.menuItem.category || '其他';
        map[cat] = (map[cat] || 0) + item.menuItem.price * item.quantity;
      });
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredOrders]);

  // Daily trend (for week/month view)
  const dailyTrend = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOrders.forEach((order) => {
      const d = new Date(order.createdAt);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      map[key] = (map[key] || 0) + order.total;
    });
    return Object.entries(map)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredOrders]);

  // Turnover statistics
  const turnoverStats = useMemo(() => {
    const dineInPaid = filteredOrders.filter(
      (o) => o.type === '內用' && o.tableNumber && o.paymentStatus === '已付款' && o.paidAt
    );

    const durations: number[] = [];
    dineInPaid.forEach((o) => {
      const start = new Date(o.createdAt).getTime();
      const end = new Date(o.paidAt).getTime();
      if (end > start) {
        durations.push((end - start) / 60000);
      }
    });

    const avgDiningMinutes = durations.length > 0
      ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
      : 0;

    const sessionSet = new Set<string>();
    dineInPaid.forEach((o) => {
      const d = new Date(o.createdAt);
      const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      sessionSet.add(`${dayKey}_${o.tableNumber}`);
    });

    const daySet = new Set<string>();
    filteredOrders.forEach((o) => {
      const d = new Date(o.createdAt);
      daySet.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    const dayCount = Math.max(1, daySet.size);

    const totalTurnovers = sessionSet.size;
    const avgTurnoversPerDay = Math.round((totalTurnovers / dayCount) * 10) / 10;

    const dailySessionSets: Record<string, Set<string>> = {};
    dineInPaid.forEach((o) => {
      const d = new Date(o.createdAt);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      if (!dailySessionSets[key]) dailySessionSets[key] = new Set();
      dailySessionSets[key].add(o.tableNumber!);
    });
    const turnoverTrend = Object.entries(dailySessionSets)
      .map(([date, tables]) => ({ date, turnovers: tables.size }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { avgDiningMinutes, totalTurnovers, avgTurnoversPerDay, turnoverTrend };
  }, [filteredOrders]);

  // Prep time statistics (cooking_at → completed_at)
  const prepTimeStats = useMemo(() => {
    const completedOrders = filteredOrders.filter(
      (o) => o.cookingAt && o.completedAt
    );

    const prepTimes: number[] = [];
    completedOrders.forEach((o) => {
      const start = new Date(o.cookingAt).getTime();
      const end = new Date(o.completedAt).getTime();
      if (end > start) {
        prepTimes.push((end - start) / 60000);
      }
    });

    const avgPrepMinutes = prepTimes.length > 0
      ? Math.round(prepTimes.reduce((s, d) => s + d, 0) / prepTimes.length)
      : 0;

    const maxPrepMinutes = prepTimes.length > 0
      ? Math.round(Math.max(...prepTimes))
      : 0;

    const minPrepMinutes = prepTimes.length > 0
      ? Math.round(Math.min(...prepTimes))
      : 0;

    return { avgPrepMinutes, maxPrepMinutes, minPrepMinutes, count: prepTimes.length };
  }, [filteredOrders]);

  // Prep time by hour trend
  const prepTimeByHour = useMemo(() => {
    const hourMap: Record<number, { total: number; count: number }> = {};
    filteredOrders.forEach((o) => {
      if (!o.cookingAt || !o.completedAt) return;
      const start = new Date(o.cookingAt).getTime();
      const end = new Date(o.completedAt).getTime();
      if (end <= start) return;
      const mins = (end - start) / 60000;
      const hour = new Date(o.cookingAt).getHours();
      if (!hourMap[hour]) hourMap[hour] = { total: 0, count: 0 };
      hourMap[hour].total += mins;
      hourMap[hour].count += 1;
    });
    return Array.from({ length: 24 }, (_, h) => ({
      hour: `${h}:00`,
      avg: hourMap[h] ? Math.round((hourMap[h].total / hourMap[h].count) * 10) / 10 : 0,
      count: hourMap[h]?.count ?? 0,
    })).filter((d) => d.count > 0);
  }, [filteredOrders]);

  // Monthly comparison data
  const monthlyComparison = useMemo(() => {
    const allOrders = orders.filter(o => o.status !== '已取消');
    const monthMap: Record<string, { revenue: number; orders: number; paid: number; avgOrder: number }> = {};

    allOrders.forEach((o) => {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { revenue: 0, orders: 0, paid: 0, avgOrder: 0 };
      monthMap[key].orders += 1;
      if (o.paymentStatus === '已付款') {
        monthMap[key].revenue += o.total;
        monthMap[key].paid += 1;
      }
    });

    const sorted = Object.entries(monthMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 12)
      .reverse();

    return sorted.map(([month, data], idx, arr) => {
      const avgOrder = data.paid > 0 ? Math.round(data.revenue / data.paid) : 0;
      const prev = idx > 0 ? arr[idx - 1][1] : null;
      const growthRate = prev && prev.revenue > 0
        ? Math.round(((data.revenue - prev.revenue) / prev.revenue) * 1000) / 10
        : null;
      const orderGrowth = prev && prev.orders > 0
        ? Math.round(((data.orders - prev.orders) / prev.orders) * 1000) / 10
        : null;

      const [y, m] = month.split('-');
      const label = `${y}/${m}`;

      return { month: label, revenue: data.revenue, orders: data.orders, avgOrder, growthRate, orderGrowth, paid: data.paid };
    });
  }, [orders]);

  const formatDuration = (mins: number) => {
    if (mins === 0) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const dateLabels = { today: '今日', week: '近7天', month: '近30天' };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-dark-wood text-dark-wood-foreground px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin/pos')} className="p-2 rounded-full hover:bg-white/10 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-serif-tc font-bold text-gold flex items-center gap-2">
              <BarChart3 size={22} />
              營收報表
            </h1>
          </div>
          <div className="flex gap-2">
            {(['today', 'week', 'month'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-gold text-dark-wood'
                    : 'bg-white/10 text-dark-wood-foreground/70 hover:bg-white/20'
                }`}
              >
                {dateLabels[range]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {[
            { icon: DollarSign, label: '營收總額', value: `$${totalRevenue.toLocaleString()}`, color: 'text-primary' },
            { icon: ShoppingBag, label: '訂單數', value: totalOrders.toString(), color: 'text-secondary' },
            { icon: TrendingUp, label: '平均客單價', value: `$${avgOrderValue}`, color: 'text-green-600' },
            { icon: Calendar, label: '待收款', value: `$${pendingPayment.toLocaleString()}`, color: 'text-orange-500' },
            { icon: Timer, label: '平均用餐時間', value: formatDuration(turnoverStats.avgDiningMinutes), color: 'text-blue-600' },
            { icon: RotateCcw, label: '翻桌次數', value: `${turnoverStats.totalTurnovers} 次`, color: 'text-purple-600' },
            { icon: UtensilsCrossed, label: '平均出餐時間', value: formatDuration(prepTimeStats.avgPrepMinutes), color: 'text-red-600' },
          ].map((kpi, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl border border-border p-5 shadow-warm"
            >
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon size={18} className={kpi.color} />
                <span className="text-sm text-muted-foreground">{kpi.label}</span>
              </div>
              <p className={`text-2xl font-serif-tc font-bold ${kpi.color}`}>{kpi.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Product Sales Ranking */}
          <div className="bg-card rounded-xl border border-border p-5 shadow-warm">
            <h3 className="font-serif-tc font-bold text-foreground mb-4">🏆 商品銷售排行</h3>
            {productSales.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">暫無數據</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productSales} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,85%)" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [`${value} 份`, '銷量']} />
                  <Bar dataKey="qty" fill="hsl(0,72%,42%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Category Breakdown */}
          <div className="bg-card rounded-xl border border-border p-5 shadow-warm">
            <h3 className="font-serif-tc font-bold text-foreground mb-4">📊 品類營收佔比</h3>
            {categoryBreakdown.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">暫無數據</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryBreakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`$${value}`, '營收']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Daily Trend */}
        {dateRange !== 'today' && dailyTrend.length > 1 && (
          <div className="bg-card rounded-xl border border-border p-5 shadow-warm">
            <h3 className="font-serif-tc font-bold text-foreground mb-4">📈 每日營收趨勢</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,85%)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [`$${value}`, '營收']} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(0,72%,42%)" strokeWidth={2} dot={{ fill: 'hsl(0,72%,42%)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Monthly Comparison */}
        {monthlyComparison.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border border-border p-5 shadow-warm"
          >
            <h3 className="font-serif-tc font-bold text-foreground mb-2">📅 月度營業額評比</h3>
            <p className="text-xs text-muted-foreground mb-4">近 {monthlyComparison.length} 個月營業額趨勢與環比分析</p>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyComparison} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,85%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'revenue' ? `$${value.toLocaleString()}` : name === 'orders' ? `${value} 筆` : `$${value}`,
                    name === 'revenue' ? '營業額' : name === 'orders' ? '訂單數' : '客單價',
                  ]}
                />
                <Bar dataKey="revenue" fill="hsl(0,72%,42%)" radius={[4, 4, 0, 0]} name="revenue" />
                <Bar dataKey="orders" fill="hsl(38,80%,55%)" radius={[4, 4, 0, 0]} name="orders" />
              </BarChart>
            </ResponsiveContainer>

            {/* Monthly comparison table */}
            <div className="overflow-x-auto mt-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">月份</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">營業額</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">環比</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">訂單數</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">環比</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">客單價</th>
                  </tr>
                </thead>
                <tbody>
                  {[...monthlyComparison].reverse().map((m) => (
                    <tr key={m.month} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-3 font-medium">{m.month}</td>
                      <td className="py-2 px-3 text-right font-bold">${m.revenue.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right">
                        {m.growthRate !== null ? (
                          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                            m.growthRate > 0 ? 'text-green-600' : m.growthRate < 0 ? 'text-red-500' : 'text-muted-foreground'
                          }`}>
                            {m.growthRate > 0 ? <ArrowUpRight size={14} /> : m.growthRate < 0 ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                            {m.growthRate > 0 ? '+' : ''}{m.growthRate}%
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2 px-3 text-right">{m.orders} 筆</td>
                      <td className="py-2 px-3 text-right">
                        {m.orderGrowth !== null ? (
                          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                            m.orderGrowth > 0 ? 'text-green-600' : m.orderGrowth < 0 ? 'text-red-500' : 'text-muted-foreground'
                          }`}>
                            {m.orderGrowth > 0 ? <ArrowUpRight size={14} /> : m.orderGrowth < 0 ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                            {m.orderGrowth > 0 ? '+' : ''}{m.orderGrowth}%
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2 px-3 text-right">${m.avgOrder}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}


        {dateRange !== 'today' && turnoverStats.turnoverTrend.length > 1 && (
          <div className="bg-card rounded-xl border border-border p-5 shadow-warm">
            <h3 className="font-serif-tc font-bold text-foreground mb-4">🔄 每日翻桌次數</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={turnoverStats.turnoverTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,85%)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip formatter={(value: number) => [`${value} 桌`, '翻桌數']} />
                <Bar dataKey="turnovers" fill="hsl(280,50%,50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              日均翻桌 {turnoverStats.avgTurnoversPerDay} 次 · 平均用餐 {formatDuration(turnoverStats.avgDiningMinutes)}
            </p>
          </div>
        )}

        {/* Prep Time by Hour Trend */}
        {prepTimeByHour.length > 1 && (
          <div className="bg-card rounded-xl border border-border p-5 shadow-warm">
            <h3 className="font-serif-tc font-bold text-foreground mb-2">⏱️ 出餐時間時段分析</h3>
            <p className="text-xs text-muted-foreground mb-4">
              平均 {formatDuration(prepTimeStats.avgPrepMinutes)} · 最快 {formatDuration(prepTimeStats.minPrepMinutes)} · 最慢 {formatDuration(prepTimeStats.maxPrepMinutes)} · 共 {prepTimeStats.count} 筆
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={prepTimeByHour}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,85%)" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} label={{ value: '分鐘', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'avg' ? `${value} 分鐘` : `${value} 筆`,
                    name === 'avg' ? '平均出餐' : '訂單數',
                  ]}
                />
                <Bar dataKey="avg" fill="hsl(0,72%,42%)" radius={[4, 4, 0, 0]} name="avg" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}


        <div className="bg-card rounded-xl border border-border p-5 shadow-warm">
          <h3 className="font-serif-tc font-bold text-foreground mb-4">📋 訂單明細</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">訂單</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">類型</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">品項</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">金額</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">狀態</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">付款</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">時間</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.slice(0, 50).map((order) => (
                  <tr key={order.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-3 font-mono text-xs">{order.id.slice(0, 8)}</td>
                    <td className="py-2 px-3">{order.type} {order.tableNumber ? `桌${order.tableNumber}` : ''}</td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {order.items.map(i => i.menuItem.name).join(', ').slice(0, 30)}
                    </td>
                    <td className="py-2 px-3 text-right font-medium">${order.total}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        order.status === '已完成' ? 'bg-green-100 text-green-700' :
                        order.status === '製作中' ? 'bg-primary/10 text-primary' :
                        'bg-accent/20 text-accent-foreground'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        order.paymentStatus === '已付款' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-orange-100 text-orange-600'
                      }`}>
                        {order.paymentStatus || '未付款'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredOrders.length === 0 && (
              <p className="text-center py-8 text-muted-foreground">選定時段內無訂單數據</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
