import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, CheckCircle2, Clock, Info } from 'lucide-react';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { cn, uid } from '../lib/utils';

type Tone = 'success' | 'info' | 'error' | 'pending';
interface ToastItem {
  id: string;
  title: string;
  body?: string;
  tone: Tone;
}

const Ctx = createContext<(t: Omit<ToastItem, 'id' | 'tone'> & { tone?: Tone }) => void>(() => {});

const icons: Record<Tone, ReactNode> = {
  success: <CheckCircle2 className="size-5 text-mint-400" />,
  info: <Info className="size-5 text-iris-400" />,
  error: <AlertCircle className="size-5 text-rose-400" />,
  pending: <Clock className="size-5 text-amber-300" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((t: Omit<ToastItem, 'id' | 'tone'> & { tone?: Tone }) => {
    const id = uid();
    setItems((s) => [...s.slice(-2), { tone: 'info', ...t, id }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:inset-x-auto sm:right-0 sm:items-end">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -24, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-[#16132a]/95 px-4 py-3.5 text-white shadow-2xl backdrop-blur-xl',
              )}
            >
              <span className="mt-0.5 shrink-0">{icons[t.tone]}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t.title}</p>
                {t.body && <p className="mt-0.5 text-[13px] text-white/60">{t.body}</p>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
