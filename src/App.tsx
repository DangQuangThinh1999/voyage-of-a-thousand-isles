import { lazy, Suspense, useLayoutEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Tabs } from './components/Tabs';
import { Toast } from './components/Toast';
import { Home } from './pages/Home';
import { Journal } from './pages/Journal';
import { MicTest } from './pages/MicTest';
import { Plan } from './pages/Plan';
import { Review } from './pages/Review';
import { Session } from './pages/Session';
import { Settings } from './pages/Settings';
import { Unit } from './pages/Unit';
import { Words } from './pages/Words';
import { Grammar } from './pages/Grammar';
import { Speak } from './pages/Speak';
import { Skills } from './pages/Skills';
const Stats = lazy(() => import('./pages/Stats'));
const StatsPage = () => <Suspense fallback={<p className="muted">Đang tải…</p>}><Stats /></Suspense>;
import { app, useApp, type Screen } from './state/store';

const PAGES: Record<Screen, () => JSX.Element | null> = {
  home: Home, unit: Unit, session: Session, words: Words, grammar: Grammar, speak: Speak, skills: Skills, stats: StatsPage, review: Review, journal: Journal, plan: Plan, settings: Settings, mic: MicTest,
};

export default function App() {
  const { scr } = useApp();
  useAfterRender();
  const Page = PAGES[scr];
  return (
    <>
      <Sidebar />
      <Header />
      <AnimatePresence mode="wait">
        <motion.main id="main" key={scr} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}><Page /></motion.main>
      </AnimatePresence>
      <Tabs />
      <Toast />
    </>
  );
}

// Sau mỗi lần vẽ: cuộn trang khi được yêu cầu, và đặt con trỏ vào ô gõ chính (như bản cũ)
function useAfterRender() {
  useLayoutEffect(() => {
    const req = app.scrollReq;
    if (req) {
      app.scrollReq = null;
      scrollTo(0, 0);
      if (req !== 'top') { const el = document.getElementById(req); if (el) el.scrollIntoView({ block: 'start' }); }
    }
    const inp = document.querySelector<HTMLElement>('#main [data-autofocus]:not(:disabled)');
    if (inp && document.activeElement !== inp) inp.focus({ preventScroll: true });
  });
}
