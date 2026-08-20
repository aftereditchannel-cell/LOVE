import { Link } from 'react-router-dom';
import { modules } from '../layout/AppShell';
import { motion } from 'framer-motion';
import { Glass, PageHeader } from '../ui/components';

export default function More() {
  return (
    <div>
      <PageHeader title="همه‌ی ابزارها ✨" subtitle="دنیای کامل دونفره‌تون" />
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {modules.filter((m) => m.to !== '/dashboard').map((m, i) => (
          <motion.div key={m.to} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Link to={m.to}>
              <Glass className="p-4 flex flex-col items-center gap-2.5 py-6 hover:bg-white/8 transition-colors text-center">
                <m.icon size={22} className="text-rose-300" />
                <span className="text-xs">{m.label}</span>
              </Glass>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
