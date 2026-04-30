import { useState } from 'react';
import { Menu, X, LogOut, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logoSrc from '../assets/logo.jpeg';

type Page = 'home' | 'products' | 'dashboard' | 'auth' | 'admin';

type NavbarProps = {
  currentPage: Page;
  onNavigate: (page: Page) => void;
};

export default function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const { user, profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: 'Home', page: 'home' as Page },
    { label: 'Invest', page: 'products' as Page },
    ...(user ? [{ label: 'Dashboard', page: 'dashboard' as Page }] : []),
    ...(profile?.is_admin ? [{ label: 'Admin', page: 'admin' as Page }] : []),
  ];

  function handleNav(page: Page) {
    onNavigate(page);
    setMobileOpen(false);
  }

  async function handleSignOut() {
    await signOut();
    onNavigate('home');
    setMobileOpen(false);
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/95 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => handleNav('home')}
            className="flex items-center gap-2.5 group shrink-0"
          >
            <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-amber-500/30">
              <img
                src={logoSrc}
                alt="CheapMarket"
                className="h-10 w-10 object-cover"
              />
            </div>
            <span className="hidden sm:block font-bold text-white text-base leading-tight">
              Cheap<span className="text-amber-400">Market</span>
            </span>
          </button>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.page}
                onClick={() => handleNav(link.page)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentPage === link.page
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5">
                  <div className="w-6 h-6 bg-amber-500/20 rounded-full flex items-center justify-center">
                    <User size={12} className="text-amber-400" />
                  </div>
                  <span className="text-sm text-gray-300 max-w-[120px] truncate">
                    {profile?.full_name || user.email?.split('@')[0]}
                  </span>
                  {profile?.is_admin && (
                    <ShieldCheck size={14} className="text-amber-400" />
                  )}
                </div>
                <div className="text-sm font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
                  ${profile?.balance.toFixed(2) || '0.00'}
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-400 transition-colors px-2 py-1.5"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNav('auth')}
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleNav('auth')}
                  className="px-4 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-400 text-gray-950 rounded-lg transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40"
                >
                  Register
                </button>
              </div>
            )}
          </div>

          {/* Mobile right side: balance if logged in + menu */}
          <div className="md:hidden flex items-center gap-2">
            {user && (
              <div className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1.5">
                ${profile?.balance.toFixed(2) || '0.00'}
              </div>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-gray-950 border-t border-gray-800 px-4 py-4 space-y-1">
          {navLinks.map((link) => (
            <button
              key={link.page}
              onClick={() => handleNav(link.page)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                currentPage === link.page
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {link.label}
            </button>
          ))}
          <div className="pt-2 border-t border-gray-800">
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-sm text-gray-400 truncate max-w-[180px]">{profile?.full_name || user.email}</span>
                  {profile?.is_admin && <ShieldCheck size={14} className="text-amber-400 ml-1 shrink-0" />}
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <LogOut size={15} />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => handleNav('auth')}
                  className="w-full px-4 py-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors text-left"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleNav('auth')}
                  className="w-full px-4 py-3 text-sm font-medium bg-amber-500 hover:bg-amber-400 text-gray-950 rounded-lg transition-all"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
