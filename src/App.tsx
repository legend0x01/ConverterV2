import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Nav from './components/Nav';
import Footer from './components/Footer';
import Home from './pages/Home';
import FormatsPage from './pages/FormatsPage';
import PrivacyPage from './pages/PrivacyPage';
import TechPage from './pages/TechPage';
import { log } from './lib/log';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-5 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-sig">404 · no such route</p>
      <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-fg">
        That path is not in the bundle
      </h1>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-mut">
        Every page here ships as a static asset, so nothing 404s on the server either. Head back to the converter.
      </p>
      <a
        href="./"
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-sig px-6 py-3.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-ink transition-transform hover:-translate-y-0.5"
      >
        Back to FileMorph
      </a>
    </main>
  );
}

export default function App() {
  useEffect(() => {
    log('system', 'filemorph 2.4.0 boot · static bundle · no backend endpoints registered');
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="flex min-h-screen flex-col bg-ink">
        <Nav />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/formats" element={<FormatsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/tech" element={<TechPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
