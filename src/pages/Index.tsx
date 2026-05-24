import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UtensilsCrossed, Settings } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-dark-wood flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-sm"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-gold flex items-center justify-center shadow-warm">
          <UtensilsCrossed size={36} className="text-gold-foreground" />
        </div>
        <h1 className="text-3xl font-serif-tc font-bold text-gold mb-2">
          虎秋文昌雞
        </h1>
        <p className="text-dark-wood-foreground/70 mb-10">
          正宗港式燒味 · 即叫即切
        </p>

        <Link
          to="/menu"
          className="block w-full py-4 bg-gradient-red text-primary-foreground font-bold text-lg rounded-2xl hover:opacity-90 transition-opacity shadow-warm text-center mb-4"
        >
          開始點餐
        </Link>

        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-dark-wood-foreground/50 hover:text-dark-wood-foreground/80 text-sm transition-colors"
        >
          <Settings size={16} />
          後台管理
        </Link>
      </motion.div>
    </div>
  );
};

export default Index;
