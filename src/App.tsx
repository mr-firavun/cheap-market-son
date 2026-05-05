import { useState, useEffect, Component, ReactNode } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import SupportChat from './components/SupportChat';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import ProductsPage from './pages/ProductsPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import MaintenancePage from './pages/MaintenancePage';
import { supabase } from './lib/supabase';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center text-center px-4">
          <div>
            <div className="text-amber-400 text-4xl mb-4">!</div>
            <p className="text-white font-semibold mb-2">Something went wrong</p>
            <p className="text-gray-400 text-sm mb-6">Please refresh the page to continue.</p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold rounded-xl text-sm transition-all"
            >
              Refresh
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

type Page = 'home' | 'products' | 'dashboard' | 'auth' | 'admin';

function AppContent() {
  const { user, loading, profile } = useAuth();
  const [page, setPage] = useState<Page>('home');
  const [maintenance, setMaintenance] = useState<boolean | null>(null);

  useEffect(() => {
    supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle()
      .then(({ data }) => {
        setMaintenance(data?.value === 'true' ? true : false);
      })
      .catch(() => setMaintenance(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('ref') && !user) {
      setPage('auth');
    }
  }, []);

  useEffect(() => {
    if (!loading && !user && (page === 'dashboard' || page === 'admin')) {
      setPage('auth');
    }
  }, [user, loading, page]);

  function navigate(p: Page) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setPage(p);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-xl shadow-amber-500/30 animate-pulse">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
          <div className="text-gray-500 text-sm">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  // Show maintenance page for non-admins when maintenance mode is on
  if (maintenance && !profile?.is_admin) {
    return <MaintenancePage />;
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar currentPage={page} onNavigate={navigate} />

      {page === 'home' && <LandingPage onNavigate={navigate} />}
      {page === 'auth' && <AuthPage onNavigate={navigate} />}
      {page === 'products' && <ProductsPage onNavigate={navigate} />}
      {page === 'dashboard' && user && <DashboardPage onNavigate={navigate} />}
      {page === 'admin' && user && <AdminPage onNavigate={navigate} />}

      <SupportChat />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
