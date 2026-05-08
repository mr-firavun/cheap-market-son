import { useEffect, useState } from 'react';
import { ShieldCheck, Wallet, TrendingUp, TrendingDown, Users, BarChart3, ArrowUpRight, Loader } from 'lucide-react';
import { supabase, Product, Profile, Transaction, Investment, SupportMessage, PlatformSetting } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import AdminTabs, { AdminTab, UserWithStats } from './AdminTabs';

type Props = {
  onNavigate: (page: 'home' | 'products' | 'dashboard' | 'auth' | 'admin') => void;
};

type InvestmentWithUser = Investment & {
  user_email?: string;
  user_name?: string;
  product_name?: string;
};

export default function AdminPage({ onNavigate }: Props) {
  const { profile } = useAuth();
  const [tab, setTab] = useState<AdminTab>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [allInvestments, setAllInvestments] = useState<InvestmentWithUser[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.is_admin) return;
    Promise.all([
      supabase.from('products').select('*').order('price'),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('support_messages').select('*').order('created_at', { ascending: true }),
      supabase.from('platform_settings').select('*'),
      supabase.from('investments').select('*, products(name)').order('created_at', { ascending: false }).limit(200),
    ]).then(([p, u, t, sm, ps, inv]) => {
      if (p.data) setProducts(p.data as Product[]);
      if (t.data) setTransactions(t.data as Transaction[]);
      if (sm.data) setSupportMessages(sm.data as SupportMessage[]);
      if (ps.data) {
        const sf: Record<string, string> = {};
        (ps.data as PlatformSetting[]).forEach((s) => { sf[s.key] = s.value; });
        setSettingsForm(sf);
      }
      const profileList = u.data as Profile[] || [];
      const txs = t.data as Transaction[] || [];
      const emailMap: Record<string, { email: string; name: string }> = {};
      profileList.forEach((pr) => { emailMap[pr.id] = { email: pr.email, name: pr.full_name }; });

      if (u.data && t.data) {
        const enriched: UserWithStats[] = profileList.map((usr) => {
          const userTxs = txs.filter((tx) => tx.user_id === usr.id);
          const total_invested = userTxs.filter((tx) => tx.type === 'investment' && tx.status === 'completed').reduce((s, tx) => s + Number(tx.amount), 0);
          const total_withdrawn = userTxs.filter((tx) => tx.type === 'withdrawal' && tx.status === 'completed').reduce((s, tx) => s + Number(tx.amount), 0);
          return { ...usr, total_invested, total_withdrawn, active_investments: 0 };
        });
        setUsers(enriched);
      }
      if (inv.data) {
        const invData = (inv.data as (Investment & { products?: { name: string } })[]).map((i) => ({
          ...i,
          user_email: emailMap[i.user_id]?.email || 'Bilinmiyor',
          user_name: emailMap[i.user_id]?.name || 'Isimsiz',
          product_name: i.products?.name || 'Urun',
        }));
        setAllInvestments(invData);
        const activeCounts: Record<string, number> = {};
        invData.filter((i) => i.status === 'active').forEach((i) => {
          activeCounts[i.user_id] = (activeCounts[i.user_id] || 0) + 1;
        });
        setUsers((prev) => prev.map((u) => ({ ...u, active_investments: activeCounts[u.id] || 0 })));
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [profile]);

  async function reloadWithdrawals() {
    try {
      const { data: txData } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(200);
      if (txData) setTransactions(txData as Transaction[]);
      const { data: uData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (uData) {
        const txs = txData as Transaction[] || [];
        const enriched: UserWithStats[] = (uData as Profile[]).map((usr) => {
          const userTxs = txs.filter((tx) => tx.user_id === usr.id);
          const total_invested = userTxs.filter((tx) => tx.type === 'investment' && tx.status === 'completed').reduce((s, tx) => s + Number(tx.amount), 0);
          const total_withdrawn = userTxs.filter((tx) => tx.type === 'withdrawal' && tx.status === 'completed').reduce((s, tx) => s + Number(tx.amount), 0);
          return { ...usr, total_invested, total_withdrawn, active_investments: 0 };
        });
        setUsers(enriched);
      }
    } catch {
      // silently ignore — stale data stays visible
    }
  }

  async function approveWithdrawal(tx: Transaction) {
    try {
      const { error } = await supabase.from('transactions').update({ status: 'completed' }).eq('id', tx.id);
      if (error) throw error;
      await reloadWithdrawals();
    } catch (err) {
      alert('Onaylama hatasi: ' + (err as Error).message);
    }
  }

  async function rejectWithdrawal(tx: Transaction) {
    try {
      const { data: usr } = await supabase.from('profiles').select('balance').eq('id', tx.user_id).maybeSingle();
      if (usr) {
        const { error } = await supabase.from('profiles').update({ balance: (usr as { balance: number }).balance + Number(tx.amount) }).eq('id', tx.user_id);
        if (error) throw error;
      }
      const { error: txErr } = await supabase.from('transactions').update({ status: 'rejected' }).eq('id', tx.id);
      if (txErr) throw txErr;
      await reloadWithdrawals();
    } catch (err) {
      alert('Red hatasi: ' + (err as Error).message);
    }
  }

  if (profile === null) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader size={28} className="animate-spin text-amber-400" />
      </div>
    );
  }

  if (!profile.is_admin) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <ShieldCheck size={48} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Bu sayfaya erisim yetkiniz yok.</p>
          <button onClick={() => onNavigate('home')} className="mt-4 text-amber-400 hover:text-amber-300 underline text-sm">Ana sayfaya don</button>
        </div>
      </div>
    );
  }

  const pendingWithdrawalCount = transactions.filter((tx) => tx.type === 'withdrawal' && tx.status === 'pending').length;
  const totalUnread = (() => {
    const map: Record<string, number> = {};
    supportMessages.forEach((msg) => {
      if (!msg.is_read && msg.sender === 'user' && msg.user_id) map[msg.user_id] = (map[msg.user_id] || 0) + 1;
    });
    return Object.values(map).reduce((s, v) => s + v, 0);
  })();

  const totalPlatformBalance = users.reduce((s, u) => s + Number(u.balance), 0);
  const totalPlatformInvested = users.reduce((s, u) => s + u.total_invested, 0);
  const totalPlatformWithdrawn = users.reduce((s, u) => s + u.total_withdrawn, 0);
  const activeUsers = users.filter((u) => u.total_invested > 0).length;
  const activeInvestmentsCount = allInvestments.filter((i) => i.status === 'active').length;

  const TABS: { key: AdminTab; label: string; badge?: number; icon: React.ReactNode }[] = [
    { key: 'products', label: 'Urunler', icon: <TrendingUp size={13} /> },
    { key: 'users', label: 'Kullanicilar', icon: <Users size={13} /> },
    { key: 'investments', label: 'Yatirimlar', icon: <BarChart3 size={13} /> },
    { key: 'transactions', label: 'Islemler', icon: <Wallet size={13} /> },
    { key: 'withdrawals', label: 'Para Cekme', badge: pendingWithdrawalCount, icon: <ArrowUpRight size={13} /> },
    { key: 'support', label: 'Destek', badge: totalUnread, icon: <TrendingDown size={13} /> },
    { key: 'settings', label: 'Ayarlar', icon: <ShieldCheck size={13} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white pt-20 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="py-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center">
            <ShieldCheck size={20} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Paneli</h1>
            <p className="text-gray-500 text-sm">Platform yonetimi</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {[
            { label: 'Toplam Bakiye', value: `$${totalPlatformBalance.toFixed(2)}`, icon: <Wallet size={14} />, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
            { label: 'Toplam Yatirim', value: `$${totalPlatformInvested.toFixed(2)}`, icon: <TrendingUp size={14} />, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
            { label: 'Toplam Cekim', value: `$${totalPlatformWithdrawn.toFixed(2)}`, icon: <TrendingDown size={14} />, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
            { label: 'Aktif Kullanici', value: activeUsers, icon: <Users size={14} />, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
            { label: 'Aktif Yatirim', value: activeInvestmentsCount, icon: <BarChart3 size={14} />, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
            { label: 'Bekleyen Cekim', value: pendingWithdrawalCount, icon: <ArrowUpRight size={14} />, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900/70 border border-gray-800 rounded-xl p-3.5">
              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center mb-2 ${s.color}`}>{s.icon}</div>
              <div className="text-lg font-bold">{s.value}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1 bg-gray-900/60 border border-gray-800 rounded-xl p-1 mb-6 w-fit">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-gray-400 hover:text-white'}`}>
              {t.icon}{t.label}
              {t.badge ? (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {t.badge > 9 ? '9+' : t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader size={28} className="animate-spin text-amber-400" /></div>
        ) : (
          <AdminTabs
            tab={tab}
            products={products}
            users={users}
            allInvestments={allInvestments}
            transactions={transactions}
            supportMessages={supportMessages}
            settingsForm={settingsForm}
            setSettingsForm={setSettingsForm}
            setProducts={setProducts}
            setUsers={setUsers}
            setTransactions={setTransactions}
            setSupportMessages={setSupportMessages}
            reloadWithdrawals={reloadWithdrawals}
            approveWithdrawal={approveWithdrawal}
            rejectWithdrawal={rejectWithdrawal}
          />
        )}
      </div>
    </div>
  );
}
