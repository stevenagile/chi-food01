import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { History, User } from 'lucide-react';

interface LogRow {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_by_name: string | null;
  created_at: string;
}

const OrderStatusLog = ({ orderId }: { orderId: string }) => {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from('order_status_logs')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setLogs((data as LogRow[]) ?? []);
        setLoading(false);
      });
  }, [open, orderId]);

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        <History size={12} />
        {open ? '收起紀錄' : '變更紀錄'}
      </button>
      {open && (
        <div className="mt-2 space-y-1 bg-muted/40 rounded-lg p-2">
          {loading && <p className="text-xs text-muted-foreground">載入中…</p>}
          {!loading && logs.length === 0 && (
            <p className="text-xs text-muted-foreground">尚無變更紀錄</p>
          )}
          {logs.map((l) => (
            <div key={l.id} className="text-xs flex items-center justify-between gap-2">
              <span className="text-foreground">
                {l.from_status ? `${l.from_status} → ` : ''}
                <span className="font-medium">{l.to_status}</span>
              </span>
              <span className="text-muted-foreground flex items-center gap-1">
                <User size={10} />
                {l.changed_by_name ?? '系統'} ·{' '}
                {new Date(l.created_at).toLocaleTimeString('zh-TW', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderStatusLog;
