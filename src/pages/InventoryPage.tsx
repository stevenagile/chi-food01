import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Pencil, Trash2, X, BookOpen, History, Sunrise, ChevronDown, ChevronRight } from 'lucide-react';
import AdminNav from '@/components/AdminNav';
import { menuItems } from '@/data/menu';
import { AnimatePresence, motion } from 'framer-motion';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  cost_per_unit: number;
  supplier_id: string | null;
  category: string;
}

interface MenuItemIngredient {
  id: string;
  menu_item_id: string;
  ingredient_id: string;
  quantity: number;
}

interface DailyHistory {
  id: string;
  stat_date: string;
  prep_amount: number;
  servings_count: number;
  revenue_amount: number;
}

const CATEGORIES = ['主料', '副料', '配料', '主食', '飲品', '調味料', '其他'];
const MAIN_CATEGORIES = ['主料', '主食'];

const todayLabel = () => new Intl.DateTimeFormat('zh-TW', {
  year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  timeZone: 'Asia/Taipei',
}).format(new Date());

interface InlineAddRecipeProps {
  mainIngredients: Ingredient[];
  existingIds: string[];
  onAdd: (ingredient_id: string, quantity: number) => Promise<void>;
}
const InlineAddRecipe = ({ mainIngredients, existingIds, onAdd }: InlineAddRecipeProps) => {
  const [ingId, setIngId] = useState('');
  const [qty, setQty] = useState('');
  const available = mainIngredients.filter(i => !existingIds.includes(i.id));
  if (available.length === 0) return null;
  return (
    <div className="flex items-center gap-2 pt-2 border-t border-dashed border-border">
      <select value={ingId} onChange={e => setIngId(e.target.value)}
        className="flex-1 px-2 py-1.5 rounded-md border border-border bg-background text-sm">
        <option value="">+ 加入主原料...</option>
        {available.map(i => <option key={i.id} value={i.id}>{i.name}（{i.unit}）</option>)}
      </select>
      <input type="number" step="0.01" placeholder="用量" value={qty}
        onChange={e => setQty(e.target.value)}
        className="w-16 px-2 py-1 rounded-md border border-border bg-background text-sm text-right" />
      <button
        onClick={async () => { const q = Number(qty); if (!ingId || !q || q <= 0) return; await onAdd(ingId, q); setIngId(''); setQty(''); }}
        disabled={!ingId || !qty}
        className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-40">加入</button>
    </div>
  );
};

const InventoryPage = () => {
  const { toast } = useToast();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<MenuItemIngredient[]>([]);
  const [history, setHistory] = useState<DailyHistory[]>([]);
  const [servedToday, setServedToday] = useState(0);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [dailyStock, setDailyStock] = useState<Record<string, string>>({});
  const [savingDaily, setSavingDaily] = useState(false);
  const [closing, setClosing] = useState(false);
  const [openRecipes, setOpenRecipes] = useState(false);
  const [openHistory, setOpenHistory] = useState(false);

  const fetchAll = async () => {
    const [i, rec] = await Promise.all([
      supabase.from('ingredients').select('*').order('category').order('name'),
      supabase.from('menu_item_ingredients').select('*'),
    ]);
    if (i.data) setIngredients(i.data as any);
    if (rec.data) setRecipes(rec.data as any);
  };

  const fetchHistory = async () => {
    const { data } = await supabase.from('daily_history' as any).select('*').order('stat_date', { ascending: false }).limit(60);
    if (data) setHistory(data as any);
  };

  const fetchServedToday = async () => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('is_archived', false)
      .gte('created_at', start.toISOString());
    setServedToday(count || 0);
  };

  useEffect(() => {
    fetchAll(); fetchHistory(); fetchServedToday();
    const ch = supabase.channel('inv-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchServedToday())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // --- 計算 ---
  const mainIngredients = useMemo(() => ingredients.filter(i => MAIN_CATEGORIES.includes(i.category)), [ingredients]);

  const totalServings = useMemo(() => {
    const configured = [...new Set(recipes.map(r => r.menu_item_id))];
    let sum = 0;
    for (const menuId of configured) {
      const itemRecipes = recipes.filter(r => r.menu_item_id === menuId);
      let m = Infinity;
      for (const r of itemRecipes) {
        const ing = ingredients.find(i => i.id === r.ingredient_id);
        if (!ing || r.quantity <= 0) { m = 0; break; }
        m = Math.min(m, Math.floor(ing.current_stock / r.quantity));
      }
      sum += m === Infinity ? 0 : m;
    }
    return sum;
  }, [recipes, ingredients]);

  const preppedCount = mainIngredients.filter(i => i.current_stock > 0).length;
  const isBlankDay = preppedCount === 0;

  const filtered = useMemo(() => {
    return ingredients.filter(i => {
      if (filterCat !== 'all' && i.category !== filterCat) return false;
      if (search && !i.name.includes(search) && !i.category.includes(search)) return false;
      return true;
    });
  }, [ingredients, filterCat, search]);

  // --- CRUD ---
  const handleSaveIngredient = async () => {
    const data = {
      name: form.name || '',
      unit: form.unit || '份',
      current_stock: Number(form.current_stock) || 0,
      min_stock: Number(form.min_stock) || 0,
      cost_per_unit: Number(form.cost_per_unit) || 0,
      supplier_id: null,
      category: form.category || '其他',
    };
    if (!data.name) { toast({ title: '請輸入名稱', variant: 'destructive' }); return; }
    if (editItem) await supabase.from('ingredients').update(data).eq('id', editItem.id);
    else await supabase.from('ingredients').insert(data);
    toast({ title: editItem ? '已更新' : '已新增', description: data.name });
    setShowForm(false); setEditItem(null); setForm({});
    fetchAll();
  };

  const handleDeleteIngredient = async (id: string) => {
    if (!confirm('確定刪除此原物料？相關配方也會一併失效。')) return;
    await supabase.from('ingredients').delete().eq('id', id);
    toast({ title: '已刪除' });
    fetchAll();
  };

  const handleSaveDailyStock = async () => {
    const entries = Object.entries(dailyStock).filter(([, v]) => v !== '' && !isNaN(Number(v)));
    if (entries.length === 0) return;
    setSavingDaily(true);
    await Promise.all(entries.map(([id, v]) =>
      supabase.from('ingredients').update({ current_stock: Number(v) }).eq('id', id)
    ));
    toast({ title: '✅ 今日備料已儲存', description: `更新 ${entries.length} 項` });
    setDailyStock({}); setSavingDaily(false); fetchAll();
  };

  const handleStartNewDay = async () => {
    if (!confirm('結束今日並開始新的一天？\n\n會封存今日訂單並將備料資料歸檔。')) return;
    setClosing(true);
    const { error } = await supabase.rpc('close_daily_stats' as any);
    setClosing(false);
    if (error) { toast({ title: '失敗', description: error.message, variant: 'destructive' }); return; }
    toast({ title: '✅ 已開始新的一天' });
    setDailyStock({}); fetchAll(); fetchHistory(); fetchServedToday();
  };

  const handleUpdateRecipeQty = async (id: string, qty: number) => {
    if (isNaN(qty) || qty <= 0) { toast({ title: '用量需大於 0', variant: 'destructive' }); return; }
    await supabase.from('menu_item_ingredients').update({ quantity: qty }).eq('id', id);
    fetchAll();
  };
  const handleDeleteRecipe = async (id: string) => {
    await supabase.from('menu_item_ingredients').delete().eq('id', id);
    fetchAll();
  };

  const openAdd = (preset?: Partial<Ingredient>) => { setEditItem(null); setForm({ category: '主料', unit: '份', ...preset }); setShowForm(true); };
  const openEdit = (item: any) => { setEditItem(item); setForm({ ...item }); setShowForm(true); };

  const dailyDraftCount = Object.values(dailyStock).filter(v => v !== '').length;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-dark-wood text-dark-wood-foreground px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-lg font-serif-tc font-bold text-gold whitespace-nowrap w-[160px] shrink-0">庫存管理</h1>
          <AdminNav />
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-4">
        {/* === 今日營運卡 === */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-900 rounded-2xl p-4">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
            <div>
              <div className="text-xs text-amber-700 dark:text-amber-300 font-medium">今日營運日</div>
              <div className="text-lg font-serif-tc font-bold text-amber-900 dark:text-amber-100">{todayLabel()}</div>
            </div>
            <button onClick={handleStartNewDay} disabled={closing}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 disabled:opacity-50 shadow-md">
              <Sunrise size={16} />{closing ? '處理中...' : '結束今日／開始新一天'}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-card/60 rounded-xl py-2">
              <div className="text-xs text-muted-foreground">今日備料項目</div>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{preppedCount}</div>
            </div>
            <div className="bg-card/60 rounded-xl py-2">
              <div className="text-xs text-muted-foreground">已出份數</div>
              <div className="text-2xl font-bold text-blue-600">{servedToday}</div>
            </div>
            <div className="bg-card/60 rounded-xl py-2">
              <div className="text-xs text-muted-foreground">剩餘可出</div>
              <div className="text-2xl font-bold text-emerald-600">{totalServings}</div>
            </div>
          </div>
          {isBlankDay && (
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-3">🌅 全新的一天，請在下方原物料清單填入今日備好的份量。</p>
          )}
        </div>

        {/* === 原物料清單（主區） === */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-serif-tc font-bold text-foreground">原物料清單</h2>
            <button onClick={() => openAdd()} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold flex items-center gap-1">
              <Plus size={14} />新增
            </button>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-sm" />
            </div>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border bg-background text-sm">
              <option value="all">全部分類</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">尚無資料，請按「新增」建立第一筆原物料。</p>
          ) : (
            <div className="space-y-2">
              {filtered.map(item => {
                const isMain = MAIN_CATEGORIES.includes(item.category);
                const low = item.min_stock > 0 && item.current_stock <= item.min_stock;
                const draft = dailyStock[item.id];
                return (
                  <div key={item.id} className={`rounded-xl border p-3 flex items-center gap-3 ${low ? 'border-red-300 bg-red-50/30 dark:bg-red-950/10' : 'border-border bg-background'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded ${isMain ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'bg-muted text-muted-foreground'}`}>{item.category}</span>
                        <span className="font-medium text-foreground truncate">{item.name}</span>
                        {low && <span className="text-xs text-red-600 font-bold">⚠ 低庫存</span>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        剩餘 <b className="text-foreground">{item.current_stock}</b> {item.unit}
                        {item.min_stock > 0 && <span> · 安全 {item.min_stock}</span>}
                      </div>
                    </div>
                    {isMain && (
                      <input type="number" step="0.1" placeholder="今日備料" value={draft ?? ''}
                        onChange={e => setDailyStock(p => ({ ...p, [item.id]: e.target.value }))}
                        className={`w-24 px-2 py-1.5 rounded-lg border bg-card text-sm text-right ${draft ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`} />
                    )}
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(item)} className="p-2 text-muted-foreground hover:bg-muted rounded-lg"><Pencil size={14} /></button>
                      <button onClick={() => handleDeleteIngredient(item.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">提示：只有「主料 / 主食」會出現今日備料輸入欄與菜單配方中。</p>
        </div>

        {/* === 折疊 1：食譜配方 === */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <button onClick={() => setOpenRecipes(o => !o)}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/40">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-primary" />
              <span className="font-serif-tc font-bold text-foreground">食譜配方</span>
              <span className="text-xs text-muted-foreground">({recipes.length} 筆設定)</span>
            </div>
            {openRecipes ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
          {openRecipes && (
            <div className="p-4 border-t border-border">
              {mainIngredients.length === 0 && (
                <p className="mb-3 text-xs text-amber-600">請先在上方新增「主料／主食」類別的原物料。</p>
              )}
              <div className="space-y-4">
                {['platter', 'rice', 'side', 'drink', 'weekend'].map(catId => {
                  const catItems = menuItems.filter(m => m.category === catId);
                  if (catItems.length === 0) return null;
                  const catName = { platter: '切盤', rice: '飯類', side: '小菜', drink: '飲品', weekend: '假日限定' }[catId as string];
                  return (
                    <div key={catId}>
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{catName}</h3>
                      <div className="space-y-2">
                        {catItems.map(mi => {
                          const itemRecipes = recipes.filter(r => r.menu_item_id === mi.id);
                          return (
                            <div key={mi.id} className="bg-background rounded-xl border border-border p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="font-medium text-foreground text-sm">{mi.name}</div>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${itemRecipes.length > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
                                  {itemRecipes.length > 0 ? `${itemRecipes.length} 種主原料` : '未設定'}
                                </span>
                              </div>
                              {itemRecipes.length > 0 && (
                                <div className="space-y-1.5 mb-2">
                                  {itemRecipes.map(r => {
                                    const ing = ingredients.find(i => i.id === r.ingredient_id);
                                    return (
                                      <div key={r.id} className="flex items-center gap-2 bg-card rounded-lg border border-border px-2 py-1.5">
                                        <span className="flex-1 text-sm truncate">{ing?.name || '未知'}</span>
                                        <input type="number" step="0.01" defaultValue={r.quantity}
                                          onBlur={e => { const v = Number(e.target.value); if (v !== r.quantity) handleUpdateRecipeQty(r.id, v); }}
                                          className="w-16 px-2 py-1 rounded-md border border-border bg-background text-sm text-right" />
                                        <span className="text-xs text-muted-foreground w-6">{ing?.unit || ''}</span>
                                        <button onClick={() => handleDeleteRecipe(r.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-md"><Trash2 size={14} /></button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              <InlineAddRecipe
                                mainIngredients={mainIngredients}
                                existingIds={itemRecipes.map(r => r.ingredient_id)}
                                onAdd={async (ingredient_id, quantity) => {
                                  const { error } = await supabase.from('menu_item_ingredients').insert({ menu_item_id: mi.id, ingredient_id, quantity } as any);
                                  if (error) { toast({ title: '失敗', description: error.message, variant: 'destructive' }); return; }
                                  fetchAll();
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* === 折疊 2：歷史紀錄 === */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <button onClick={() => setOpenHistory(o => !o)}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/40">
            <div className="flex items-center gap-2">
              <History size={18} className="text-primary" />
              <span className="font-serif-tc font-bold text-foreground">歷史紀錄</span>
              <span className="text-xs text-muted-foreground">({history.length} 天)</span>
            </div>
            {openHistory ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
          {openHistory && (
            <div className="p-4 border-t border-border">
              {history.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground text-sm">尚無歷史紀錄</p>
              ) : (
                <div className="space-y-2">
                  {history.map(h => (
                    <div key={h.id} className="bg-background rounded-xl border border-border p-3">
                      <div className="font-bold text-foreground mb-1 text-sm">{h.stat_date}</div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div><div className="text-muted-foreground">備料</div><div className="font-bold text-amber-600">${Number(h.prep_amount).toLocaleString()}</div></div>
                        <div><div className="text-muted-foreground">出餐</div><div className="font-bold text-blue-600">{h.servings_count} 份</div></div>
                        <div><div className="text-muted-foreground">收款</div><div className="font-bold text-green-600">${Number(h.revenue_amount).toLocaleString()}</div></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 浮動「儲存今日備料」按鈕 */}
      {dailyDraftCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-4xl mx-auto z-40">
          <button onClick={handleSaveDailyStock} disabled={savingDaily}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg">
            {savingDaily ? '儲存中...' : `儲存今日備料（${dailyDraftCount} 項）`}
          </button>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl p-6 max-w-md w-full mx-4 shadow-warm max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif-tc font-bold text-lg">{editItem ? '編輯原物料' : '新增原物料'}</h3>
                <button onClick={() => setShowForm(false)} className="p-1"><X size={20} /></button>
              </div>
              <div className="space-y-3">
                <input placeholder="名稱 *" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <select value={form.category || '其他'} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-border bg-background text-sm">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input placeholder="單位（隻/份/碗）" value={form.unit || ''} onChange={e => setForm({ ...form, unit: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-border bg-background text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" placeholder="今日庫存" value={form.current_stock ?? ''} onChange={e => setForm({ ...form, current_stock: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-border bg-background text-sm" />
                  <input type="number" placeholder="安全存量" value={form.min_stock ?? ''} onChange={e => setForm({ ...form, min_stock: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-border bg-background text-sm" />
                </div>
                <p className="text-xs text-muted-foreground">分類選「主料」或「主食」才會出現在今日備料與菜單配方中。</p>
                <button onClick={handleSaveIngredient} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold">
                  {editItem ? '更新' : '新增'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InventoryPage;
