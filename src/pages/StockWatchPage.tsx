import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Search,
  ArrowUpDown,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Package,
  RefreshCw,
} from 'lucide-react';
import AdminNav from '@/components/AdminNav';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  category: string;
}

interface Movement {
  ingredient_id: string;
  ingredient_name: string;
  type: '進貨' | '領用';
  quantity: number;
  unit: string;
  date: string;
  note?: string | null;
}

type SortKey = 'name' | 'category' | 'current_stock' | 'min_stock' | 'ratio';
type StatusFilter = 'all' | 'low' | 'out' | 'ok';

const StockWatchPage = () => {
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('ratio');
  const [sortAsc, setSortAsc] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const [ingRes, purRes, reqRes] = await Promise.all([
      supabase.from('ingredients').select('*').order('name'),
      supabase
        .from('purchase_records')
        .select('ingredient_id, quantity, purchase_date, note, ingredients(name, unit)')
        .order('purchase_date', { ascending: false })
        .limit(30),
      supabase
        .from('requisition_records')
        .select('ingredient_id, quantity, requisition_date, note, ingredients(name, unit)')
        .order('requisition_date', { ascending: false })
        .limit(30),
    ]);

    if (ingRes.data) setIngredients(ingRes.data as any);

    const ms: Movement[] = [];
    (purRes.data ?? []).forEach((r: any) => {
      ms.push({
        ingredient_id: r.ingredient_id,
        ingredient_name: r.ingredients?.name ?? '—',
        type: '進貨',
        quantity: Number(r.quantity),
        unit: r.ingredients?.unit ?? '',
        date: r.purchase_date,
        note: r.note,
      });
    });
    (reqRes.data ?? []).forEach((r: any) => {
      ms.push({
        ingredient_id: r.ingredient_id,
        ingredient_name: r.ingredients?.name ?? '—',
        type: '領用',
        quantity: Number(r.quantity),
        unit: r.ingredients?.unit ?? '',
        date: r.requisition_date,
        note: r.note,
      });
    });
    ms.sort((a, b) => (a.date < b.date ? 1 : -1));
    setMovements(ms.slice(0, 40));
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const ch = supabase
      .channel('stock-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, () => fetchAll())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(ingredients.map((i) => i.category))).sort(),
    [ingredients]
  );

  const getStatus = (i: Ingredient): StatusFilter => {
    if (i.current_stock <= 0) return 'out';
    if (i.min_stock > 0 && i.current_stock <= i.min_stock) return 'low';
    return 'ok';
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = ingredients.filter((i) => {
      if (q && !i.name.toLowerCase().includes(q)) return false;
      if (category !== 'all' && i.category !== category) return false;
      if (status !== 'all' && getStatus(i) !== status) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      if (sortKey === 'name') {
        av = a.name; bv = b.name;
      } else if (sortKey === 'category') {
        av = a.category; bv = b.category;
      } else if (sortKey === 'ratio') {
        av = a.min_stock > 0 ? a.current_stock / a.min_stock : 9999;
        bv = b.min_stock > 0 ? b.current_stock / b.min_stock : 9999;
      } else {
        av = a[sortKey]; bv = b[sortKey];
      }
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [ingredients, search, category, status, sortKey, sortAsc]);

  const stats = useMemo(() => {
    const total = ingredients.length;
    const out = ingredients.filter((i) => i.current_stock <= 0).length;
    const low = ingredients.filter(
      (i) => i.current_stock > 0 && i.min_stock > 0 && i.current_stock <= i.min_stock
    ).length;
    return { total, out, low };
  }, [ingredients]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc((v) => !v);
    else { setSortKey(k); setSortAsc(true); }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-dark-wood text-dark-wood-foreground px-4 py-3 flex items-center gap-3 flex-wrap">
        <h1 className="text-lg font-serif-tc font-bold text-gold flex items-center gap-2 whitespace-nowrap w-[160px] shrink-0">
          <Package size={20} /> 庫存速覽
        </h1>
        <AdminNav />
        <button
          onClick={fetchAll}
          className="ml-auto p-2 bg-white/10 rounded-xl hover:bg-white/20"
          title="重新整理"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 p-4">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-warm">
          <div className="text-xs text-muted-foreground">食材總數</div>
          <div className="text-3xl font-bold text-foreground mt-1">{stats.total}</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <div className="text-xs text-orange-700 flex items-center gap-1">
            <AlertTriangle size={14} /> 低於安全量
          </div>
          <div className="text-3xl font-bold text-orange-700 mt-1">{stats.low}</div>
        </div>
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4">
          <div className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle size={14} /> 已售完
          </div>
          <div className="text-3xl font-bold text-destructive mt-1">{stats.out}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 px-4 pb-6">
        {/* Left: list */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜尋食材..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-background border border-border text-sm"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 rounded-xl bg-background border border-border text-sm"
            >
              <option value="all">全部分類</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="flex gap-1 bg-muted rounded-xl p-1">
              {([
                ['all', '全部'],
                ['low', '偏低'],
                ['out', '售完'],
                ['ok', '正常'],
              ] as [StatusFilter, string][]).map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setStatus(k)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                    status === k ? 'bg-primary text-white' : 'text-foreground'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-auto max-h-[60vh]">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  {([
                    ['name', '食材'],
                    ['category', '分類'],
                    ['current_stock', '剩餘'],
                    ['min_stock', '安全量'],
                    ['ratio', '狀態'],
                  ] as [SortKey, string][]).map(([k, l]) => (
                    <th
                      key={k}
                      onClick={() => toggleSort(k)}
                      className="text-left px-3 py-2 font-bold cursor-pointer select-none"
                    >
                      <span className="inline-flex items-center gap-1">
                        {l}
                        <ArrowUpDown size={12} className={sortKey === k ? 'text-primary' : 'text-muted-foreground'} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">無資料</td>
                  </tr>
                ) : (
                  filtered.map((i) => {
                    const st = getStatus(i);
                    const ratio = i.min_stock > 0 ? Math.min(100, (i.current_stock / i.min_stock) * 100) : 100;
                    return (
                      <tr key={i.id} className="border-t border-border hover:bg-muted/50">
                        <td className="px-3 py-2 font-bold">{i.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{i.category}</td>
                        <td className="px-3 py-2 font-bold">
                          {i.current_stock} <span className="text-xs text-muted-foreground">{i.unit}</span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {i.min_stock} {i.unit}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden min-w-[60px]">
                              <div
                                className={`h-full ${
                                  st === 'out' ? 'bg-destructive' : st === 'low' ? 'bg-orange-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${ratio}%` }}
                              />
                            </div>
                            <span className={`text-xs font-bold ${
                              st === 'out' ? 'text-destructive' : st === 'low' ? 'text-orange-600' : 'text-emerald-600'
                            }`}>
                              {st === 'out' ? '售完' : st === 'low' ? '偏低' : '正常'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: recent movements */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h2 className="font-bold text-base mb-3 flex items-center gap-2">
            <RefreshCw size={16} /> 近期變動
          </h2>
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {movements.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 text-sm">尚無紀錄</div>
            ) : (
              movements.map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2 rounded-lg bg-background border border-border"
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      m.type === '進貨' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {m.type === '進貨' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{m.ingredient_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.date} · {m.type}
                    </div>
                  </div>
                  <div className={`font-bold text-sm ${m.type === '進貨' ? 'text-emerald-600' : 'text-orange-600'}`}>
                    {m.type === '進貨' ? '+' : '-'}{m.quantity}{m.unit}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockWatchPage;
