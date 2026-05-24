import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Package, Search, Pencil, Trash2, X, BookOpen, CalendarCheck, Calculator, Save, History, RotateCcw, Sunrise, AlertTriangle } from 'lucide-react';
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

type Tab = 'today' | 'availability' | 'setup' | 'history';
type SetupView = 'byMenu' | 'byIngredient';

interface DailyHistory {
  id: string;
  stat_date: string;
  prep_amount: number;
  servings_count: number;
  revenue_amount: number;
}

const CATEGORIES = ['主料', '副料', '配料', '主食', '飲品', '調味料', '其他'];
// 只有「主料」與「主食」會出現在今日備料 / 食譜 BOM
const MAIN_CATEGORIES = ['主料', '主食'];

interface InlineAddRecipeProps {
  menuItemId: string;
  mainIngredients: Ingredient[];
  existingIds: string[];
  onAdd: (ingredient_id: string, quantity: number) => Promise<void>;
}

const InlineAddRecipe = ({ mainIngredients, existingIds, onAdd }: InlineAddRecipeProps) => {
  const [ingId, setIngId] = useState('');
  const [qty, setQty] = useState('');
  const available = mainIngredients.filter(i => !existingIds.includes(i.id));

  const handleAdd = async () => {
    const q = Number(qty);
    if (!ingId || !q || q <= 0) return;
    await onAdd(ingId, q);
    setIngId(''); setQty('');
  };

  if (available.length === 0) return null;

  return (
    <div className="flex items-center gap-2 pt-2 border-t border-dashed border-border">
      <select
        value={ingId}
        onChange={e => setIngId(e.target.value)}
        className="flex-1 px-2 py-1.5 rounded-md border border-border bg-background text-sm"
      >
        <option value="">+ 加入主原料...</option>
        {available.map(i => <option key={i.id} value={i.id}>{i.name}（{i.unit}）</option>)}
      </select>
      <input
        type="number"
        step="0.01"
        placeholder="用量"
        value={qty}
        onChange={e => setQty(e.target.value)}
        className="w-16 px-2 py-1 rounded-md border border-border bg-background text-sm text-right"
      />
      <button
        onClick={handleAdd}
        disabled={!ingId || !qty}
        className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-40"
      >
        加入
      </button>
    </div>
  );
};

const todayLabel = () => {
  const now = new Date();
  const tw = new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
    timeZone: 'Asia/Taipei',
  }).format(now);
  return tw;
};

const InventoryPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('today');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<MenuItemIngredient[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [dailyStock, setDailyStock] = useState<Record<string, string>>({});
  const [savingDaily, setSavingDaily] = useState(false);
  const [history, setHistory] = useState<DailyHistory[]>([]);
  const [closing, setClosing] = useState(false);
  const [setupView, setSetupView] = useState<SetupView>('byMenu');

  const [form, setForm] = useState<any>({});

  const fetchAll = async () => {
    const [i, rec] = await Promise.all([
      supabase.from('ingredients').select('*').order('category').order('name'),
      supabase.from('menu_item_ingredients').select('*'),
    ]);
    if (i.data) setIngredients(i.data as any);
    if (rec.data) setRecipes(rec.data as any);
  };

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('daily_history' as any)
      .select('*')
      .order('stat_date', { ascending: false })
      .limit(60);
    if (data) setHistory(data as any);
  };

  useEffect(() => {
    fetchAll();
    fetchHistory();
    // 即時更新庫存（POS 出餐後同步）
    const ch = supabase
      .channel('inv-page-ingredients')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleStartNewDay = async () => {
    if (!confirm('確定要結束今日並開始新的一天嗎？\n\n系統會：\n1. 將今日營運資料移轉到歷史紀錄\n2. 封存今日所有訂單\n3. 清空所有原物料庫存（明天從空白開始）\n\n此操作無法還原。')) return;
    setClosing(true);
    const { data, error } = await supabase.rpc('close_daily_stats' as any);
    setClosing(false);
    if (error) {
      toast({ title: '結算失敗', description: error.message, variant: 'destructive' });
      return;
    }
    const r = data as any;
    toast({
      title: '✅ 已開始新的一天',
      description: `今日營運：備料 $${r.prep_amount} / 出餐 ${r.servings_count} 份 / 收款 $${r.revenue_amount}`,
    });
    setDailyStock({});
    await fetchAll();
    await fetchHistory();
  };

  const filtered = useMemo(() => {
    if (!search) return ingredients;
    return ingredients.filter(i => i.name.includes(search) || i.category.includes(search));
  }, [ingredients, search]);

  // --- Ingredient CRUD ---
  const handleSaveIngredient = async () => {
    const data = {
      name: form.name || '',
      unit: form.unit || '個',
      current_stock: Number(form.current_stock) || 0,
      min_stock: Number(form.min_stock) || 0,
      cost_per_unit: Number(form.cost_per_unit) || 0,
      supplier_id: null,
      category: form.category || '其他',
    };
    if (!data.name) { toast({ title: '請輸入名稱', variant: 'destructive' }); return; }

    if (editItem) {
      await supabase.from('ingredients').update(data).eq('id', editItem.id);
      toast({ title: '已更新', description: data.name });
    } else {
      await supabase.from('ingredients').insert(data);
      toast({ title: '已新增', description: data.name });
    }
    setShowForm(false); setEditItem(null); setForm({});
    fetchAll();
  };

  const handleDeleteIngredient = async (id: string) => {
    await supabase.from('ingredients').delete().eq('id', id);
    toast({ title: '已刪除' });
    fetchAll();
  };

  // --- Recipe (BOM) ---
  const mainIngredients = useMemo(
    () => ingredients.filter(i => MAIN_CATEGORIES.includes(i.category)),
    [ingredients]
  );

  const handleUpdateRecipeQty = async (id: string, qty: number) => {
    if (isNaN(qty) || qty <= 0) { toast({ title: '用量需大於 0', variant: 'destructive' }); return; }
    await supabase.from('menu_item_ingredients').update({ quantity: qty }).eq('id', id);
    toast({ title: '已更新用量' });
    fetchAll();
  };

  const handleDeleteRecipeIngredient = async (id: string) => {
    await supabase.from('menu_item_ingredients').delete().eq('id', id);
    toast({ title: '已刪除' });
    fetchAll();
  };

  const openAdd = () => { setEditItem(null); setForm({}); setShowForm(true); };
  const openEdit = (item: any) => { setEditItem(item); setForm({ ...item }); setShowForm(true); };

  // --- 今日備料：直接輸入今日數量，儲存後即更新庫存 ---
  const handleSaveDailyStock = async () => {
    const entries = Object.entries(dailyStock).filter(([, val]) => val !== '' && !isNaN(Number(val)));
    if (entries.length === 0) return;
    setSavingDaily(true);
    const updates = entries.map(([id, val]) =>
      supabase.from('ingredients').update({ current_stock: Number(val) }).eq('id', id)
    );
    await Promise.all(updates);
    toast({ title: '✅ 今日備料已儲存', description: `已更新 ${entries.length} 項主原料` });
    setDailyStock({});
    setSavingDaily(false);
    fetchAll();
  };

  // --- Availability calculation ---
  const menuAvailability = useMemo(() => {
    const configuredMenuIds = [...new Set(recipes.map(r => r.menu_item_id))];
    return configuredMenuIds.map(menuId => {
      const mi = menuItems.find(m => m.id === menuId);
      if (!mi) return null;
      const itemRecipes = recipes.filter(r => r.menu_item_id === menuId);
      let maxServings = Infinity;
      const details: { ingredientName: string; needed: number; stock: number; unit: string; servings: number }[] = [];

      for (const r of itemRecipes) {
        const ing = ingredients.find(i => i.id === r.ingredient_id);
        if (!ing || r.quantity <= 0) {
          maxServings = 0;
          details.push({ ingredientName: ing?.name || '未知', needed: r.quantity, stock: 0, unit: ing?.unit || '', servings: 0 });
          continue;
        }
        const servings = Math.floor(ing.current_stock / r.quantity);
        maxServings = Math.min(maxServings, servings);
        details.push({ ingredientName: ing.name, needed: r.quantity, stock: ing.current_stock, unit: ing.unit, servings });
      }
      if (maxServings === Infinity) maxServings = 0;
      return { menuItem: mi, maxServings, details };
    }).filter(Boolean) as { menuItem: typeof menuItems[0]; maxServings: number; details: { ingredientName: string; needed: number; stock: number; unit: string; servings: number }[] }[];
  }, [recipes, ingredients]);

  const totalServings = useMemo(
    () => menuAvailability.reduce((s, m) => s + m.maxServings, 0),
    [menuAvailability]
  );
  const soldOutCount = useMemo(
    () => menuAvailability.filter(m => m.maxServings === 0).length,
    [menuAvailability]
  );
  const stockedMainCount = useMemo(
    () => mainIngredients.filter(i => i.current_stock > 0).length,
    [mainIngredients]
  );
  const isBlankDay = stockedMainCount === 0;

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'today', label: '今日備料', icon: CalendarCheck },
    { key: 'availability', label: '可出份數', icon: Calculator },
    { key: 'setup', label: '食材與配方', icon: BookOpen },
    { key: 'history', label: '歷史紀錄', icon: History },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-dark-wood text-dark-wood-foreground px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-lg font-serif-tc font-bold text-gold whitespace-nowrap w-[160px] shrink-0">庫存管理</h1>
          <AdminNav />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setShowForm(false); }}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${tab === t.key ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
          >
            <t.icon size={16} />{t.label}
          </button>
        ))}
      </div>

      <div className="p-4 max-w-4xl mx-auto">

        {/* === 今日備料 === */}
        {tab === 'today' && (
          <>
            {/* 今日資訊條 */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-900 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="text-xs text-amber-700 dark:text-amber-300 font-medium">今日營運日</div>
                  <div className="text-lg font-serif-tc font-bold text-amber-900 dark:text-amber-100">{todayLabel()}</div>
                  <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    {isBlankDay
                      ? '🌅 全新的一天，請填入今日備好的主原料數量'
                      : `已備料 ${stockedMainCount} 項主原料 · 估計可出 ${totalServings} 份餐點`}
                  </div>
                </div>
                <button
                  onClick={handleStartNewDay}
                  disabled={closing}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 disabled:opacity-50 shadow-md"
                  title="封存今日資料、清空庫存，開始新的一天"
                >
                  <Sunrise size={16} />{closing ? '處理中...' : '結束今日 / 開始新一天'}
                </button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-3 mb-3 text-xs text-muted-foreground flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 text-amber-500 shrink-0" />
              <span>
                只列出「主原料（主料／主食）」。輸入今日備好的份量後按下方儲存，系統會即時換算「可出份數」，每筆訂單會自動扣減。隔天請按上方「開始新一天」重置。
              </span>
            </div>

            {mainIngredients.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground mb-2">尚無主原料</p>
                <button onClick={() => { setTab('setup'); setSetupView('byIngredient'); }} className="text-primary text-sm font-medium hover:underline">前往新增主原料 →</button>
              </div>
            ) : (
              <div className="space-y-2">
                {MAIN_CATEGORIES.map(cat => {
                  const catItems = mainIngredients.filter(i => i.category === cat);
                  if (catItems.length === 0) return null;
                  return (
                    <div key={cat}>
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-3 mb-2">{cat}</h3>
                      {catItems.map(item => {
                        const draft = dailyStock[item.id];
                        const editing = draft !== undefined && draft !== '';
                        const empty = item.current_stock <= 0;
                        return (
                          <div
                            key={item.id}
                            className={`bg-card rounded-xl border p-3 mb-2 flex items-center gap-3 transition ${
                              empty ? 'border-dashed border-muted-foreground/30' : 'border-border'
                            } ${editing ? 'ring-2 ring-primary/40' : ''}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-foreground">{item.name}</div>
                              <div className="text-xs mt-0.5">
                                {empty ? (
                                  <span className="text-muted-foreground">尚未備料</span>
                                ) : (
                                  <span className="text-emerald-600">今日剩餘：<b>{item.current_stock}</b> {item.unit}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.1"
                                placeholder={empty ? '今日數量' : '修改'}
                                value={draft ?? ''}
                                onChange={e => setDailyStock(prev => ({ ...prev, [item.id]: e.target.value }))}
                                className="w-24 px-3 py-2 rounded-xl border border-border bg-background text-sm text-right"
                              />
                              <span className="text-xs text-muted-foreground w-8">{item.unit}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {Object.entries(dailyStock).filter(([,v]) => v !== '').length > 0 && (
              <div className="sticky bottom-4 mt-4">
                <button
                  onClick={handleSaveDailyStock}
                  disabled={savingDaily}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"
                >
                  <Save size={18} />{savingDaily ? '儲存中...' : `儲存今日備料 (${Object.entries(dailyStock).filter(([,v]) => v !== '').length} 項)`}
                </button>
              </div>
            )}
          </>
        )}

        {/* === 可出份數 === */}
        {tab === 'availability' && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-card border border-border rounded-2xl p-3 text-center">
                <div className="text-xs text-muted-foreground">可出總份數</div>
                <div className="text-2xl font-bold text-foreground">{totalServings}</div>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-3 text-center">
                <div className="text-xs text-emerald-700 dark:text-emerald-300">可供應品項</div>
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{menuAvailability.length - soldOutCount}</div>
              </div>
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl p-3 text-center">
                <div className="text-xs text-red-700 dark:text-red-300">已售完品項</div>
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">{soldOutCount}</div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4">依目前剩餘主原料即時換算每道菜可出份數，POS 與線上點餐都會同步扣減。</p>

            {menuAvailability.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground mb-2">尚未設定任何食譜配方</p>
                <button onClick={() => { setTab('setup'); setSetupView('byMenu'); }} className="text-primary text-sm font-medium hover:underline">前往設定食譜 →</button>
              </div>
            ) : (
              <div className="space-y-3">
                {menuAvailability.sort((a, b) => a.maxServings - b.maxServings).map(item => (
                  <div key={item.menuItem.id} className={`bg-card rounded-xl border p-4 ${item.maxServings === 0 ? 'border-red-300 dark:border-red-800' : item.maxServings <= 5 ? 'border-amber-300 dark:border-amber-800' : 'border-border'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-bold text-foreground text-base">{item.menuItem.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">${item.menuItem.price}</span>
                      </div>
                      <div className={`text-2xl font-bold px-3 py-1 rounded-xl ${
                        item.maxServings === 0 ? 'bg-red-100 dark:bg-red-950/50 text-red-600' :
                        item.maxServings <= 5 ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-600' :
                        'bg-green-100 dark:bg-green-950/50 text-green-600'
                      }`}>
                        {item.maxServings} <span className="text-sm font-normal">份</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {item.details.map((d, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{d.ingredientName}</span>
                          <span>
                            剩 {d.stock} {d.unit} ÷ 每份 {d.needed} = <b className={d.servings <= 5 ? 'text-amber-600' : 'text-foreground'}>{d.servings} 份</b>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* === 食材與配方（合併分頁） === */}
        {tab === 'setup' && (
          <>
            {/* 內部視角切換 + 新增原料按鈕 */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex bg-muted rounded-xl p-1 flex-1">
                <button
                  onClick={() => setSetupView('byMenu')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${setupView === 'byMenu' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
                >
                  📋 依菜單配方
                </button>
                <button
                  onClick={() => setSetupView('byIngredient')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${setupView === 'byIngredient' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
                >
                  🧂 原物料清單
                </button>
              </div>
              <button onClick={openAdd} className="px-3 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold flex items-center gap-1 whitespace-nowrap">
                <Plus size={16} />新增原料
              </button>
            </div>

            {setupView === 'byMenu' && (<>
        {false && tab === 'recipes' && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-3 mb-4 text-xs text-amber-800 dark:text-amber-200">
              📋 BOM 主原料配方：每個品項只記錄主原料（雞、鴨、飯、小菜本體等），副料／調味料不列入。可在下方直接編輯所有品項。
            </div>

            {mainIngredients.length === 0 && (
              <p className="mb-4 text-xs text-amber-600">尚無主原料，請先到「原物料設定」分頁新增分類為「主料」或「主食」的項目。</p>
            )}

            <div className="space-y-6">
              {['platter', 'rice', 'side', 'drink', 'weekend'].map(catId => {
                const catItems = menuItems.filter(m => m.category === catId);
                if (catItems.length === 0) return null;
                const catName = { platter: '切盤', rice: '飯類', side: '小菜', drink: '飲品', weekend: '假日限定' }[catId as string];
                return (
                  <div key={catId}>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{catName}</h3>
                    <div className="space-y-3">
                      {catItems.map(mi => {
                        const itemRecipes = recipes.filter(r => r.menu_item_id === mi.id);
                        return (
                          <div key={mi.id} className="bg-card rounded-xl border border-border p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium text-foreground">{mi.name}</div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${itemRecipes.length > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
                                {itemRecipes.length > 0 ? `${itemRecipes.length} 種主原料` : '未設定'}
                              </span>
                            </div>

                            {itemRecipes.length > 0 && (
                              <div className="space-y-1.5 mb-2">
                                {itemRecipes.map(r => {
                                  const ing = ingredients.find(i => i.id === r.ingredient_id);
                                  return (
                                    <div key={r.id} className="flex items-center gap-2 bg-background rounded-lg border border-border px-2 py-1.5">
                                      <span className="flex-1 text-sm text-foreground truncate">{ing?.name || '未知'}</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        defaultValue={r.quantity}
                                        onBlur={e => {
                                          const v = Number(e.target.value);
                                          if (v !== r.quantity) handleUpdateRecipeQty(r.id, v);
                                        }}
                                        className="w-16 px-2 py-1 rounded-md border border-border bg-card text-sm text-right"
                                      />
                                      <span className="text-xs text-muted-foreground w-6">{ing?.unit || ''}</span>
                                      <button
                                        onClick={() => handleDeleteRecipeIngredient(r.id)}
                                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-md"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <InlineAddRecipe
                              menuItemId={mi.id}
                              mainIngredients={mainIngredients}
                              existingIds={itemRecipes.map(r => r.ingredient_id)}
                              onAdd={async (ingredient_id, quantity) => {
                                const { error } = await supabase.from('menu_item_ingredients').insert({
                                  menu_item_id: mi.id,
                                  ingredient_id,
                                  quantity,
                                } as any);
                                if (error) {
                                  toast({ title: '新增失敗', description: error.message, variant: 'destructive' });
                                  return;
                                }
                                toast({ title: '已新增', description: mi.name });
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
          </>
        )}

        {/* === Ingredients Setup === */}
        {tab === 'ingredients' && (
          <>
            <div className="bg-card border border-border rounded-xl p-3 mb-4 text-xs text-muted-foreground">
              管理所有可用的原物料（含分類與單位）。只有「主料」與「主食」會出現在「今日備料」與「食譜配方」。日常作業不需進來，這裡是初次設定／新增食材時用。
            </div>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="搜尋原物料..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-card text-sm"
                />
              </div>
              <button onClick={openAdd} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold flex items-center gap-1">
                <Plus size={16} />新增
              </button>
            </div>
            <div className="space-y-2">
              {filtered.map(item => (
                <div key={item.id} className="bg-card rounded-xl border border-border p-3 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${MAIN_CATEGORIES.includes(item.category) ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'bg-muted'}`}>{item.category}</span>
                      <span className="font-medium text-foreground">{item.name}</span>
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <span>單位: {item.unit}</span>
                      <span>今日剩餘: <b className="text-foreground">{item.current_stock}</b> {item.unit}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(item)} className="p-2 text-muted-foreground hover:bg-muted rounded-lg"><Pencil size={14} /></button>
                    <button onClick={() => handleDeleteIngredient(item.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <p className="text-center py-10 text-muted-foreground">尚無原物料資料</p>}
            </div>
          </>
        )}

        {/* === History Tab === */}
        {tab === 'history' && (
          <>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">歷史每日營運紀錄</h3>
            {history.length === 0 ? (
              <p className="text-center py-10 text-muted-foreground">尚無歷史紀錄。每天結束時請於「今日備料」頁按「結束今日 / 開始新一天」。</p>
            ) : (
              <div className="space-y-2">
                {history.map(h => (
                  <div key={h.id} className="bg-card rounded-xl border border-border p-4">
                    <div className="font-bold text-foreground mb-2">{h.stat_date}</div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-xs text-muted-foreground">備料金額</div>
                        <div className="text-base font-bold text-amber-600">${Number(h.prep_amount).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">出餐份數</div>
                        <div className="text-base font-bold text-blue-600">{h.servings_count} 份</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">收款金額</div>
                        <div className="text-base font-bold text-green-600">${Number(h.revenue_amount).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* === Modal Form (僅原物料設定用) === */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl p-6 max-w-md w-full mx-4 shadow-warm max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif-tc font-bold text-lg text-foreground">
                  {editItem ? '編輯原物料' : '新增原物料'}
                </h3>
                <button onClick={() => setShowForm(false)} className="p-1 text-muted-foreground"><X size={20} /></button>
              </div>

              <div className="space-y-3">
                <input placeholder="名稱 *" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <select value={form.category || '其他'} onChange={e => setForm({ ...form, category: e.target.value })} className="px-3 py-2 rounded-xl border border-border bg-background text-sm">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input placeholder="單位（隻/份/碗）" value={form.unit || ''} onChange={e => setForm({ ...form, unit: e.target.value })} className="px-3 py-2 rounded-xl border border-border bg-background text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" placeholder="今日庫存" value={form.current_stock ?? ''} onChange={e => setForm({ ...form, current_stock: e.target.value })} className="px-3 py-2 rounded-xl border border-border bg-background text-sm" />
                  <input type="number" placeholder="安全存量" value={form.min_stock ?? ''} onChange={e => setForm({ ...form, min_stock: e.target.value })} className="px-3 py-2 rounded-xl border border-border bg-background text-sm" />
                </div>
                <p className="text-xs text-muted-foreground">提示：分類選「主料」或「主食」才會出現在今日備料與食譜中。</p>
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
