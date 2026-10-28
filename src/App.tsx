import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { InstallPrompt } from './components/InstallPrompt';
import { LogoMark } from './components/Logo';
import { ToastProvider } from './components/Toast';
import { AuthProvider, isReturning, useAuth } from './lib/auth';
import { DataProvider } from './lib/store';
import { Activity } from './pages/Activity';
import { Forgot, SignIn, SignUp, Welcome } from './pages/auth/AuthPages';
import { Home } from './pages/Home';
import { PlanDetail } from './pages/PlanDetail';
import { Plans } from './pages/Plans';
import { Settings } from './pages/Settings';
import { Wallet } from './pages/Wallet';

function Splash() {
  return (
    <motion.div className="fixed inset-0 z-[100] grid place-items-center bg-bg" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.4 } }}>
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
        <LogoMark size={72} animated />
      </motion.div>
    </motion.div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to={isReturning() ? '/signin' : '/welcome'} replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { loading } = useAuth();
  const loc = useLocation();
  const authKey = ['/welcome', '/signin', '/signup', '/forgot'].includes(loc.pathname) ? loc.pathname : 'app';
  return (
    <>
      <AnimatePresence>{loading && <Splash key="splash" />}</AnimatePresence>
      {!loading && (
        <AnimatePresence mode="wait">
          <motion.div key={authKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <Routes location={loc}>
              <Route path="/welcome" element={<PublicOnly><Welcome /></PublicOnly>} />
              <Route path="/signin" element={<PublicOnly><SignIn /></PublicOnly>} />
              <Route path="/signup" element={<PublicOnly><SignUp /></PublicOnly>} />
              <Route path="/forgot" element={<PublicOnly><Forgot /></PublicOnly>} />
              <Route element={<RequireAuth><AppShell /></RequireAuth>}>
                <Route index element={<Home />} />
                <Route path="plans" element={<Plans />} />
                <Route path="plans/:id" element={<PlanDetail />} />
                <Route path="activity" element={<Activity />} />
                <Route path="wallet" element={<Wallet />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      )}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>
            <AppRoutes />
            <InstallPrompt />
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
