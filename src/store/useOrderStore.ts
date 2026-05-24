import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import type { Order, CartItem } from '@/data/menu';

interface OrderState {
  orders: Order[];
  loading: boolean;
  fetchOrders: (includeArchived?: boolean) => Promise<void>;
  addOrder: (order: Order) => Promise<void>;
  updateOrderStatus: (id: string, status: Order['status']) => Promise<void>;
  updatePaymentStatus: (id: string, paymentStatus: '未付款' | '已付款', paymentMethod?: string) => Promise<void>;
  updateOrderItems: (id: string, items: CartItem[], total: number) => Promise<void>;
  archiveOrder: (id: string) => Promise<void>;
  archiveAllOrders: () => Promise<void>;
  subscribeToOrders: () => () => void;
}

type OrderRow = Tables<'orders'>;

const mapRowToOrder = (row: OrderRow): Order => ({
  id: row.id,
  type: row.type as Order['type'],
  tableNumber: row.table_number ?? undefined,
  items: (row.items as unknown as CartItem[]) ?? [],
  total: row.total,
  status: row.status as Order['status'],
  createdAt: new Date(row.created_at),
  customerName: row.customer_name ?? undefined,
  customerPhone: row.customer_phone ?? undefined,
  paymentStatus: (row.payment_status as Order['paymentStatus']) ?? '未付款',
  paymentMethod: (row.payment_method as Order['paymentMethod']) ?? null,
  paidAt: row.paid_at ? new Date(row.paid_at) : null,
  guestCount: row.guest_count ?? null,
  cookingAt: row.cooking_at ? new Date(row.cooking_at) : null,
  completedAt: row.completed_at ? new Date(row.completed_at) : null,
});

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  loading: false,

  fetchOrders: async (includeArchived = false) => {
    set({ loading: true });
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }

    const { data, error } = await query;

    if (!error && data) {
      set({ orders: data.map(mapRowToOrder), loading: false });
    } else {
      set({ loading: false });
    }
  },

  addOrder: async (order) => {
    const { error } = await supabase.from('orders').insert({
      id: order.id,
      type: order.type,
      table_number: order.tableNumber ?? null,
      items: order.items as unknown as TablesInsert<'orders'>['items'],
      total: order.total,
      status: order.status,
      customer_name: order.customerName ?? null,
      customer_phone: order.customerPhone ?? null,
      payment_status: order.paymentStatus ?? '未付款',
    });

    if (!error) {
      set((state) => ({ orders: [order, ...state.orders] }));
    }
  },

  updateOrderStatus: async (id, status) => {
    const updateData: TablesUpdate<'orders'> = { status };
    const now = new Date().toISOString();
    if (status === '製作中') {
      updateData.cooking_at = now;
    } else if (status === '已完成') {
      updateData.completed_at = now;
    }

    const prev = get().orders.find((o) => o.id === id);

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id);

    if (!error) {
      // 寫入狀態變更紀錄（含操作人員）
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        let displayName: string | null = user?.email ?? null;
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', user.id)
            .maybeSingle();
          if (profile?.display_name) displayName = profile.display_name;
        }
        await supabase.from('order_status_logs').insert({
          order_id: id,
          from_status: prev?.status ?? null,
          to_status: status,
          changed_by: user?.id ?? null,
          changed_by_name: displayName,
        });
      } catch (e) {
        console.warn('無法寫入狀態紀錄', e);
      }

      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === id ? {
            ...o,
            status,
            ...(status === '製作中' ? { cookingAt: new Date(now) } : {}),
            ...(status === '已完成' ? { completedAt: new Date(now) } : {}),
          } : o
        ),
      }));
    }
  },

  updatePaymentStatus: async (id, paymentStatus, paymentMethod) => {
    const updateData: TablesUpdate<'orders'> = {
      payment_status: paymentStatus,
      payment_method: paymentMethod ?? null,
    };
    if (paymentStatus === '已付款') {
      updateData.paid_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id);

    if (!error) {
      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === id
            ? { ...o, paymentStatus, paymentMethod: (paymentMethod as Order['paymentMethod']) ?? null, paidAt: paymentStatus === '已付款' ? new Date() : null }
            : o
        ),
      }));
    }
  },

  updateOrderItems: async (id, items, total) => {
    const { error } = await supabase
      .from('orders')
      .update({ items: items as any, total })
      .eq('id', id);

    if (!error) {
      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === id ? { ...o, items, total } : o
        ),
      }));
    }
  },

  archiveOrder: async (id) => {
    const { error } = await supabase
      .from('orders')
      .update({ is_archived: true, table_number: null })
      .eq('id', id);
    if (!error) {
      set((state) => ({ orders: state.orders.filter((o) => o.id !== id) }));
    }
  },

  archiveAllOrders: async () => {
    const { error } = await supabase.rpc('archive_all_orders');
    if (!error) {
      set({ orders: [] });
    }
  },

  subscribeToOrders: () => {
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          get().fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
