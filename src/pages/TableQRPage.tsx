import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';
import { QrCode, Printer } from 'lucide-react';
import AdminNav from '@/components/AdminNav';
import { useNavigate } from 'react-router-dom';

const TableQRPage = () => {
  const [tableCount, setTableCount] = useState(10);
  const navigate = useNavigate();
  // Use published URL for QR codes so customers can scan without needing to log in
  const baseUrl = 'https://tong-chi-food-order.lovable.app';

  const tables = Array.from({ length: tableCount }, (_, i) => i + 1);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-dark-wood text-dark-wood-foreground px-6 py-4 print:hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-serif-tc font-bold text-gold flex items-center gap-2 whitespace-nowrap w-[160px] shrink-0">
              <QrCode size={20} />
              桌號 QR Code
            </h1>
            <AdminNav />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm opacity-80">桌數：</label>
            <input
              type="number"
              min={1}
              max={50}
              value={tableCount}
              onChange={(e) => setTableCount(Math.max(1, Math.min(50, Number(e.target.value))))}
              className="w-16 px-2 py-1.5 rounded-lg bg-white/10 border border-white/20 text-center text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
            />
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gold text-dark-wood rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Printer size={16} />
              列印全部
            </button>
          </div>
        </div>
      </div>

      {/* QR Code Grid */}
      <div className="max-w-5xl mx-auto p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 print:grid-cols-3 print:gap-4">
          {tables.map((tableNum) => {
            const url = `${baseUrl}/menu?table=${tableNum}`;
            return (
              <motion.div
                key={tableNum}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: tableNum * 0.03 }}
                className="bg-card rounded-xl border border-border p-5 flex flex-col items-center shadow-warm print:shadow-none print:border print:break-inside-avoid"
              >
                <h3 className="font-serif-tc font-bold text-lg text-foreground mb-1">
                  桌 {tableNum}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">虎秋文昌雞</p>
                <div className="bg-white p-3 rounded-lg">
                  <QRCodeSVG
                    value={url}
                    size={140}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center break-all print:hidden">
                  {url}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TableQRPage;
