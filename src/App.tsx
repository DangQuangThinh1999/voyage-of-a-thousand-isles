import { useLayoutEffect } from 'react';
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
import { app, useApp, type Screen } from './state/store';

const PAGES: Record<Screen, () => JSX.Element | null> = {
  home: Home, unit: Unit, session: Session, words: Words, review: Review, journal: Journal, plan: Plan, settings: Settings, mic: MicTest,
};

export default function App() {
  const { scr } = useApp();
  useAfterRender();
  const Page = PAGES[scr];
  return (
    <>
      <Sidebar />
      <Header />
      <main id="main"><Page /></main>
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
    if (inp && document.activeElement !== inp) inp.focus();
  });
}
