import { useEffect, useState, useRef } from 'react';
import {
  Wallet, TrendingUp, Clock, CheckCircle, ArrowDownLeft, ArrowUpRight,
  Copy, Check, Users, BarChart2, RefreshCw, Loader, ChevronRight, Save,
  AlertCircle, User, Lock, Phone, Eye, EyeOff, Shield, ShieldCheck,
} from 'lucide-react';
import { supabase, Investment, Transaction } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Props = {
  onNavigate: (page: 'home' | 'products' | 'dashboard' | 'auth' | 'admin') => void;
};

type DashTab = 'overview' | 'investments' | 'transactions' | 'profile';

const TX_TYPE_LABELS: Record<string, string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  investment: 'Investment',
  profit: 'Profit',
  referral_bonus: 'Referral Bonus',
};

const TX_TYPE_COLORS: Record<string, string> = {
  deposit: 'text-emerald-400',
  withdrawal: 'text-red-400',
  investment: 'text-amber-400',
  profit: 'text-emerald-400',
  referral_bonus: 'text-sky-400',
};

// ── Minimal SVG chart ──────────────────────────────────────────────────────
function ProfitChart({ transactions }: { transactions: Transaction[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    ro.observe(containerRef.current);
    setWidth(containerRef.current.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Build daily net balance data for last 30 days
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const days: { date: string; net: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' });
    days.push({ date: label, net: 0 });
  }

  transactions.forEach((tx) => {
    if (tx.status !== 'completed') return;
    const txDate = new Date(tx.created_at);
    const diffMs = today.getTime() - txDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 29) return;
    const idx = 29 - diffDays;
    if (idx < 0 || idx > 29) return;
    if (['deposit', 'profit', 'referral_bonus'].includes(tx.type)) {
      days[idx].net += Number(tx.amount);
    } else if (['withdrawal', 'investment'].includes(tx.type)) {
      days[idx].net -= Number(tx.amount);
    }
  });

  // Running cumulative
  const cumulative: number[] = [];
  let running = 0;
  days.forEach((d) => { running += d.net; cumulative.push(running); });

  const minVal = Math.min(...cumulative, 0);
  const maxVal = Math.max(...cumulative, 0.01);
  const range = maxVal - minVal || 1;

  const H = 180;
  const padL = 48;
  const padR = 12;
  const padT = 16;
  const padB = 32;
  const chartW = width - padL - padR;
  const chartH = H - padT - padB;

  function xPos(i: number) { return padL + (i / (days.length - 1)) * chartW; }
  function yPos(v: number) { return padT + chartH - ((v - minVal) / range) * chartH; }

  const pts = cumulative.map((v, i) => `${xPos(i).toFixed(1)},${yPos(v).toFixed(1)}`).join(' ');
  const areaPath = `M${xPos(0).toFixed(1)},${yPos(cumulative[0]).toFixed(1)} ` +
    cumulative.slice(1).map((v, i) => `L${xPos(i + 1).toFixed(1)},${yPos(v).toFixed(1)}`).join(' ') +
    ` L${xPos(days.length - 1).toFixed(1)},${(padT + chartH).toFixed(1)} L${padL.toFixed(1)},${(padT + chartH).toFixed(1)} Z`;

  const zeroY = yPos(0);
  const tickCount = 4;
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => minVal + (range / tickCount) * i);

  const labelEvery = Math.ceil(days.length / 6);

  const lastVal = cumulative[cumulative.length - 1];
  const isPositive = lastVal >= 0;

  return (
    <div ref={containerRef} className="w-full">
      <svg width={width} height={H} className="overflow-visible">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isPositive ? '#10b981' : '#f43f5e'} stopOpacity="0.25" />
            <stop offset="100%" stopColor={isPositive ? '#10b981' : '#f43f5e'} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Y grid lines + labels */}
        {yTicks.map((val, i) => {
          const y = yPos(val);
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#374151" strokeWidth="1" strokeDasharray="4,3" />
              <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#6b7280">
                {val >= 1000 ? `$${(val / 1000).toFixed(1)}k` : `$${val.toFixed(0)}`}
              </text>
            </g>
          );
        })}

        {/* Zero baseline */}
        {minVal < 0 && maxVal > 0 && (
          <line x1={padL} y1={zeroY} x2={width - padR} y2={zeroY} stroke="#6b7280" strokeWidth="1.5" />
        )}

        {/* Area fill */}
        <path d={areaPath} fill="url(#areaGrad)" />

        {/* Line */}
        <polyline points={pts} fill="none" stroke={isPositive ? '#10b981' : '#f43f5e'} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* X labels */}
        {days.map((d, i) => i % labelEvery === 0 && (
          <text key={i} x={xPos(i)} y={H - 4} textAnchor="middle" fontSize="10" fill="#6b7280">{d.date}</text>
        ))}

        {/* Last dot */}
        <circle cx={xPos(days.length - 1)} cy={yPos(lastVal)} r="4" fill={isPositive ? '#10b981' : '#f43f5e'} />
      </svg>
    </div>
  );
}

export default function DashboardPage({ onNavigate }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [tab, setTab] = useState<DashTab>('overview');
  const [processing, setProcessing] = useState(false);
  const [depositAddress, setDepositAddress] = useState('');

  // Wallet
  const [walletInput, setWalletInput] = useState('');
  const [savingWallet, setSavingWallet] = useState(false);
  const [walletSaved, setWalletSaved] = useState(false);
  const [walletError, setWalletError] = useState('');

  // Withdrawal
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  // ── Profile tab ──────────────────────────────────────────────────────────
  const [profileName, setProfileName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Phone
  const [phoneInput, setPhoneInput] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('investments').select('*, products(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(60),
      supabase.from('platform_settings').select('value').eq('key', 'deposit_address').maybeSingle(),
    ]).then(([invRes, txRes, addrRes]) => {
      if (invRes.data) setInvestments(invRes.data as Investment[]);
      if (txRes.data) setTransactions(txRes.data as Transaction[]);
      if (addrRes.data) setDepositAddress((addrRes.data as { value: string }).value);
      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (profile?.wallet_address) setWalletInput(profile.wallet_address);
    if (profile?.full_name) setProfileName(profile.full_name);
    if (profile?.phone_number) setPhoneInput(profile.phone_number);
  }, [profile]);

  async function processCompletedInvestments() {
    if (!user || !profile || processing) return;
    setProcessing(true);
    const now = new Date();
    const completed = investments.filter((inv) => inv.status === 'active' && new Date(inv.end_date) <= now);

    for (const inv of completed) {
      const totalReturn = inv.amount + inv.profit_amount;
      await supabase.from('investments').update({ status: 'completed' }).eq('id', inv.id);
      await supabase.from('profiles').update({ balance: profile.balance + totalReturn }).eq('id', user.id);
      await supabase.from('transactions').insert({ user_id: user.id, type: 'profit', amount: inv.profit_amount, status: 'completed', description: 'Investment profit', reference_id: inv.id });
      if (profile.referred_by) {
        const referralBonus = inv.profit_amount * 0.1;
        const { data: refProfile } = await supabase.from('profiles').select('balance').eq('id', profile.referred_by).maybeSingle();
        if (refProfile) {
          await supabase.from('profiles').update({ balance: (refProfile as { balance: number }).balance + referralBonus }).eq('id', profile.referred_by);
          await supabase.from('transactions').insert({ user_id: profile.referred_by, type: 'referral_bonus', amount: referralBonus, status: 'completed', description: 'Referral commission' });
        }
      }
    }

    await refreshProfile();
    const [invRes, txRes] = await Promise.all([
      supabase.from('investments').select('*, products(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(60),
    ]);
    if (invRes.data) setInvestments(invRes.data as Investment[]);
    if (txRes.data) setTransactions(txRes.data as Transaction[]);
    setProcessing(false);
  }

  function copyAddr() { navigator.clipboard.writeText(depositAddress); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  function copyRef() {
    if (!profile) return;
    navigator.clipboard.writeText(`${window.location.origin}?ref=${profile.referral_code}`);
    setCopiedRef(true); setTimeout(() => setCopiedRef(false), 2000);
  }

  function isValidTRC20(addr: string): boolean { return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr); }

  async function saveWalletAddress() {
    if (!user) return;
    setWalletError('');
    const trimmed = walletInput.trim();
    if (!trimmed) { setWalletError('Address cannot be empty.'); return; }
    if (!isValidTRC20(trimmed)) { setWalletError('Invalid address. A TRC20 address must start with "T" and be 34 characters long.'); return; }
    setSavingWallet(true);
    await supabase.from('profiles').update({ wallet_address: trimmed }).eq('id', user.id);
    await refreshProfile();
    setSavingWallet(false);
    setWalletSaved(true);
    setTimeout(() => setWalletSaved(false), 2500);
  }

  async function requestWithdrawal() {
    if (!user || !profile) return;
    setWithdrawError('');
    const trimmedAddr = walletInput.trim();
    if (!trimmedAddr) { setWithdrawError('Please enter your USDT TRC20 withdrawal address.'); return; }
    if (!isValidTRC20(trimmedAddr)) { setWithdrawError('Invalid address. A TRC20 address must start with "T" and be 34 characters long.'); return; }
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) { setWithdrawError('Please enter a valid amount.'); return; }
    if (amount < 50) { setWithdrawError('Minimum withdrawal amount is $50 USDT.'); return; }
    if (amount > profile.balance) { setWithdrawError('Insufficient balance.'); return; }

    setWithdrawing(true);
    await supabase.from('profiles').update({ balance: profile.balance - amount, wallet_address: trimmedAddr }).eq('id', user.id);
    await supabase.from('transactions').insert({ user_id: user.id, type: 'withdrawal', amount, status: 'pending', description: 'Withdrawal request', withdrawal_address: trimmedAddr });
    await refreshProfile();
    const { data: txData } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(60);
    if (txData) setTransactions(txData as Transaction[]);
    setWithdrawAmount('');
    setWithdrawing(false);
    setWithdrawSuccess(true);
    setTimeout(() => setWithdrawSuccess(false), 4000);
  }

  // ── Profile save ──────────────────────────────────────────────────────────
  async function saveProfileInfo() {
    if (!user) return;
    if (!profileName.trim()) return;
    setSavingProfile(true);
    await supabase.from('profiles').update({ full_name: profileName.trim() }).eq('id', user.id);
    await refreshProfile();
    setSavingProfile(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  }

  // ── Password change ───────────────────────────────────────────────────────
  async function changePassword() {
    setPasswordError('');
    setPasswordSuccess('');
    if (!currentPassword) { setPasswordError('Please enter your current password.'); return; }
    if (newPassword.length < 6) { setPasswordError('New password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('New passwords do not match.'); return; }
    if (currentPassword === newPassword) { setPasswordError('New password cannot be the same as the current password.'); return; }

    setChangingPassword(true);

    // Re-authenticate with current password first
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: profile?.email || '',
      password: currentPassword,
    });

    if (signInErr) {
      setChangingPassword(false);
      setPasswordError('Current password is incorrect. Please check and try again.');
      return;
    }

    // Update password
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });

    setChangingPassword(false);

    if (updateErr) {
      setPasswordError('Password could not be updated. Please try again.');
      return;
    }

    setPasswordSuccess('Your password has been updated successfully.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordSuccess(''), 4000);
  }

  // ── Phone save ────────────────────────────────────────────────────────────
  function isValidPhone(phone: string): boolean {
    return /^\+?[0-9\s\-()]{7,20}$/.test(phone.trim());
  }

  async function savePhone() {
    if (!user) return;
    setPhoneError('');
    if (!isValidPhone(phoneInput)) { setPhoneError('Please enter a valid phone number. (e.g. +1 555 123 4567)'); return; }
    setSavingPhone(true);
    await supabase.from('profiles').update({ phone_number: phoneInput.trim() }).eq('id', user.id);
    await refreshProfile();
    setSavingPhone(false);
    setPhoneSaved(true);
    setTimeout(() => setPhoneSaved(false), 2500);
  }

  const activeInvestments = investments.filter((i) => i.status === 'active');
  const completedInvestments = investments.filter((i) => i.status === 'completed');
  const totalInvested = activeInvestments.reduce((s, i) => s + i.amount, 0);
  const totalEarned = completedInvestments.reduce((s, i) => s + i.profit_amount, 0);
  const hasCompletable = investments.some((inv) => inv.status === 'active' && new Date(inv.end_date) <= new Date());
  const pendingWithdrawals = transactions.filter((tx) => tx.type === 'withdrawal' && tx.status === 'pending');

  const TABS: { key: DashTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'investments', label: 'Investments' },
    { key: 'transactions', label: 'Transaction History' },
    { key: 'profile', label: 'Profile & Security' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white pt-20 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="py-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">Welcome, {profile?.full_name || user?.email?.split('@')[0]}</h1>
            <p className="text-gray-500 text-sm">Welcome to your account dashboard.</p>
          </div>
          {profile?.is_admin && (
            <button
              onClick={() => onNavigate('admin')}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-semibold rounded-xl transition-all shrink-0"
            >
              <ShieldCheck size={16} />
              Admin Paneli
            </button>
          )}
        </div>

        {/* Deposit Banner */}
        <div className="bg-gray-900/70 border border-emerald-500/20 rounded-2xl p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <ArrowDownLeft size={18} className="text-emerald-400" />
              </div>
              <div>
                <div className="font-semibold text-sm">Deposit Balance</div>
                <div className="text-xs text-gray-500">Send USDT to the address below to top up your account</div>
              </div>
            </div>
            <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 min-h-[42px] flex items-center">
                {depositAddress
                  ? <span className="text-xs text-gray-300 font-mono break-all">{depositAddress}</span>
                  : <span className="text-xs text-gray-600 italic">Address not configured yet</span>}
              </div>
              <button onClick={copyAddr} disabled={!depositAddress}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all shrink-0 disabled:opacity-40 ${copied ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'}`}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy Address'}
              </button>
            </div>
            <div className="text-xs text-amber-500/70 shrink-0">Min. $50 USDT</div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Balance', value: `$${Number(profile?.balance ?? 0).toFixed(2)}`, icon: <Wallet size={18} />, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
            { label: 'Active Investment', value: `$${totalInvested.toFixed(2)}`, icon: <TrendingUp size={18} />, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
            { label: 'Total Earned', value: `$${totalEarned.toFixed(2)}`, icon: <BarChart2 size={18} />, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
            { label: 'Active Packages', value: `${activeInvestments.length}`, icon: <Clock size={18} />, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900/70 border border-gray-800 rounded-xl p-4">
              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center mb-3 ${s.color}`}>{s.icon}</div>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 bg-gray-900/60 border border-gray-800 rounded-xl p-1 mb-6 w-fit">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-gray-400 hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader size={28} className="animate-spin text-amber-400" /></div>

        ) : tab === 'overview' ? (
          <div className="space-y-6">
            {/* Profit/Loss chart */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-base">Profit / Loss Chart</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Cumulative net balance movement over the last 30 days</p>
                </div>
                <div className={`text-lg font-bold ${totalEarned >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {totalEarned >= 0 ? '+' : ''}${totalEarned.toFixed(2)}
                </div>
              </div>
              {transactions.length > 0 ? (
                <ProfitChart transactions={transactions} />
              ) : (
                <div className="h-44 flex items-center justify-center text-gray-600 text-sm">
                  No transactions yet. Chart will appear after your first investment.
                </div>
              )}
            </div>

            {/* Top cards */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Referral */}
              <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Users size={16} className="text-sky-400" />
                  <span className="font-semibold text-sm">Referral System</span>
                </div>
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">Invite friends and earn <strong className="text-sky-400">10%</strong> commission.</p>
                <div className="bg-gray-800 rounded-lg p-3 mb-3">
                  <div className="text-xs text-gray-400">Your Referral Code:</div>
                  <div className="text-sm font-mono font-bold text-amber-400 mt-0.5">{profile?.referral_code}</div>
                </div>
                <button onClick={copyRef}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${copiedRef ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'}`}>
                  {copiedRef ? <Check size={14} /> : <Copy size={14} />}
                  {copiedRef ? 'Copied!' : 'Copy Referral Link'}
                </button>
              </div>

              {/* Quick invest */}
              <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={16} className="text-amber-400" />
                  <span className="font-semibold text-sm">Quick Invest</span>
                </div>
                <p className="text-xs text-gray-400 mb-5 leading-relaxed">Browse investment packages and start earning today.</p>
                {hasCompletable && (
                  <button onClick={processCompletedInvestments} disabled={processing}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm font-medium mb-3 transition-all">
                    {processing ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Collect Profits
                  </button>
                )}
                <button onClick={() => onNavigate('products')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-400 text-gray-950 rounded-lg text-sm font-semibold transition-all">
                  Browse Packages <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Withdrawal */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <ArrowUpRight size={16} className="text-rose-400" />
                <span className="font-semibold text-sm">Withdraw</span>
              </div>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">Enter your USDT TRC20 address and the amount you want to withdraw.</p>

              {pendingWithdrawals.length > 0 && (
                <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-3">
                  <Clock size={13} className="text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-300">You have {pendingWithdrawals.length} pending withdrawal request(s).</p>
                </div>
              )}
              {withdrawSuccess && (
                <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-3">
                  <Check size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-emerald-300">Withdrawal request submitted.</p>
                </div>
              )}
              {withdrawError && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-3">
                  <AlertCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-300">{withdrawError}</p>
                </div>
              )}

              {/* Wallet address input */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-400 mb-1">USDT TRC20 Cekim Adresiniz</label>
                <p className="text-xs text-gray-500 mb-2 leading-relaxed">
                  Lutfen USDT'yi gondermemizi istediginiz TRC20 cuzdan adresinizi yapistirin. Bu adres admin tarafindan goruntur ve odeme bu adrese gonderilecektir.
                </p>
                <input type="text" value={walletInput} onChange={(e) => { setWalletInput(e.target.value); setWalletError(''); }}
                  placeholder="T... (TRC20 adresi buraya yapistirin)"
                  className={`w-full bg-gray-800 border text-white placeholder-gray-600 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none transition-colors ${walletError ? 'border-red-500/60' : 'border-gray-700 focus:border-rose-500/50'}`} />
                {walletError && <div className="flex items-start gap-1.5 mt-1.5"><AlertCircle size={12} className="text-red-400 mt-0.5 shrink-0" /><p className="text-xs text-red-400">{walletError}</p></div>}
              </div>

              {/* Amount input */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Amount</label>
                <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3">
                  <span className="text-gray-500 text-sm">$</span>
                  <input type="number" value={withdrawAmount} onChange={(e) => { setWithdrawAmount(e.target.value); setWithdrawError(''); }}
                    placeholder="0.00" min="50"
                    className="flex-1 bg-transparent text-white py-2.5 text-sm focus:outline-none" />
                  <span className="text-gray-500 text-xs">USDT</span>
                </div>
              </div>

              <button onClick={requestWithdrawal} disabled={withdrawing || !withdrawAmount || !walletInput.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-500/80 hover:bg-rose-500 disabled:opacity-40 text-white rounded-lg text-sm font-semibold transition-all">
                {withdrawing ? <Loader size={14} className="animate-spin" /> : <ArrowUpRight size={14} />}
                Submit Withdrawal Request
              </button>
              <p className="text-xs text-gray-600 mt-2 text-center">Bakiye: <span className="text-gray-400">${Number(profile?.balance ?? 0).toFixed(2)}</span> &bull; Min. $50 USDT</p>
            </div>
          </div>

        ) : tab === 'investments' ? (
          <div className="space-y-3">
            {investments.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
                <p>No investments yet.</p>
                <button onClick={() => onNavigate('products')} className="mt-4 text-amber-400 hover:text-amber-300 text-sm underline">Browse packages</button>
              </div>
            ) : investments.map((inv) => {
              const isDone = inv.status === 'completed';
              const isExpired = inv.status === 'active' && new Date(inv.end_date) <= new Date();
              return (
                <div key={inv.id} className="bg-gray-900/70 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="font-semibold text-sm">{inv.products?.name || 'Investment'}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Purchased on {new Date(inv.start_date).toLocaleDateString('en-US')}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-amber-400">${inv.amount.toFixed(2)}</div>
                      <div className="text-xs text-emerald-400">+${inv.profit_amount.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="text-gray-500">Profit rate: <span className="text-emerald-400 font-medium">{inv.profit_rate}%</span></div>
                    <span className={`flex items-center gap-1 font-medium ${isDone ? 'text-emerald-400' : isExpired ? 'text-amber-400' : 'text-gray-400'}`}>
                      {isDone ? <><CheckCircle size={12} /> Completed</> : isExpired ? <><Clock size={12} /> Ready</> : <><Clock size={12} /> Active</>}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

        ) : tab === 'transactions' ? (
          <div className="space-y-2">
            {transactions.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <ArrowUpRight size={40} className="mx-auto mb-3 opacity-30" />
                <p>No transactions yet.</p>
              </div>
            ) : transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between bg-gray-900/70 border border-gray-800 rounded-xl px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${['deposit', 'profit', 'referral_bonus'].includes(tx.type) ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                    {['deposit', 'profit', 'referral_bonus'].includes(tx.type)
                      ? <ArrowDownLeft size={14} className="text-emerald-400" />
                      : <ArrowUpRight size={14} className="text-red-400" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{TX_TYPE_LABELS[tx.type]}</div>
                    {tx.description && <div className="text-xs text-gray-500">{tx.description}</div>}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-semibold text-sm ${TX_TYPE_COLORS[tx.type]}`}>
                    {['deposit', 'profit', 'referral_bonus'].includes(tx.type) ? '+' : '-'}${tx.amount.toFixed(2)}
                  </div>
                  <div className={`text-xs font-medium mt-0.5 ${tx.status === 'completed' ? 'text-emerald-400/70' : tx.status === 'pending' ? 'text-amber-400/70' : tx.status === 'rejected' ? 'text-red-400/70' : 'text-gray-600'}`}>
                    {tx.status === 'completed' ? 'Completed' : tx.status === 'pending' ? 'Pending' : tx.status === 'rejected' ? 'Rejected' : tx.status}
                  </div>
                  <div className="text-xs text-gray-600">{new Date(tx.created_at).toLocaleDateString('en-US')}</div>
                </div>
              </div>
            ))}
          </div>

        ) : (
          /* ── PROFILE & SECURITY TAB ── */
          <div className="grid lg:grid-cols-2 gap-6">

            {/* Profile info */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <User size={16} className="text-amber-400" />
                <h3 className="font-bold">Profile Information</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Full Name</label>
                  <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
                  <input type="text" value={profile?.email || ''} disabled
                    className="w-full bg-gray-800/40 border border-gray-700/50 text-gray-500 rounded-lg px-3 py-2.5 text-sm cursor-not-allowed" />
                  <p className="text-xs text-gray-600 mt-1">Email cannot be changed.</p>
                </div>
                <button onClick={saveProfileInfo} disabled={savingProfile || !profileName.trim()}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40 ${profileSaved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500 hover:bg-amber-400 text-gray-950'}`}>
                  {savingProfile ? <Loader size={14} className="animate-spin" /> : profileSaved ? <Check size={14} /> : <Save size={14} />}
                  {profileSaved ? 'Saved!' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Password change */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <Lock size={16} className="text-amber-400" />
                <h3 className="font-bold">Change Password</h3>
              </div>

              {passwordSuccess && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-4 text-sm text-emerald-300">
                  <CheckCircle size={14} className="shrink-0" /> {passwordSuccess}
                </div>
              )}
              {passwordError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4 text-sm text-red-400">
                  <AlertCircle size={14} className="shrink-0" /> {passwordError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Current Password</label>
                  <div className="relative">
                    <input type={showCurrentPass ? 'text' : 'password'} value={currentPassword}
                      onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(''); }}
                      placeholder="Your current password"
                      className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 pr-10 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
                    <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showCurrentPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">New Password</label>
                  <div className="relative">
                    <input type={showNewPass ? 'text' : 'password'} value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                      placeholder="At least 6 characters"
                      className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 pr-10 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
                    <button type="button" onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Confirm New Password</label>
                  <input type={showNewPass ? 'text' : 'password'} value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                    placeholder="Re-enter new password"
                    className={`w-full bg-gray-800 border text-white placeholder-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none ${confirmPassword && newPassword !== confirmPassword ? 'border-red-500/50' : 'border-gray-700 focus:border-amber-500/50'}`} />
                  {confirmPassword && newPassword !== confirmPassword && <p className="text-xs text-red-400 mt-1">Passwords do not match.</p>}
                </div>
                <button onClick={changePassword} disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-gray-950 rounded-lg text-sm font-semibold transition-all">
                  {changingPassword ? <Loader size={14} className="animate-spin" /> : <Lock size={14} />}
                  Update Password
                </button>
              </div>
            </div>

            {/* Phone */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 lg:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={16} className="text-amber-400" />
                <h3 className="font-bold">Phone Number</h3>
              </div>
              <p className="text-xs text-gray-500 mb-5">
                Add your phone number to improve account security.
              </p>
              <div className="max-w-sm space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="tel" value={phoneInput}
                      onChange={(e) => { setPhoneInput(e.target.value); setPhoneError(''); }}
                      placeholder="+1 555 123 4567"
                      className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
                  </div>
                  {phoneError && <p className="text-xs text-red-400 mt-1.5">{phoneError}</p>}
                </div>
                <button onClick={savePhone} disabled={savingPhone || !phoneInput.trim()}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40 ${phoneSaved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500 hover:bg-amber-400 text-gray-950'}`}>
                  {savingPhone ? <Loader size={14} className="animate-spin" /> : phoneSaved ? <Check size={14} /> : <Save size={14} />}
                  {phoneSaved ? 'Saved!' : 'Save Number'}
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
