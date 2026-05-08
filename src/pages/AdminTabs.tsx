import { useState, useRef } from 'react';
import {
  Package, Users, TrendingUp, DollarSign, ArrowUpRight,
  MessageSquare, Settings, Search, Eye, UserCog, Check, X,
  Loader, ToggleLeft, ToggleRight, Wallet, TrendingDown,
  BarChart3, CalendarDays, Hash, Link as LinkIcon,
  Image, Plus, Copy, AlertTriangle, AlertCircle, Globe, ChevronRight, Trash2, Upload,
} from 'lucide-react';
import { supabase, Product, Profile, Transaction, Investment, SupportMessage } from '../lib/supabase';

export type AdminTab = 'products' | 'users' | 'investments' | 'transactions' | 'withdrawals' | 'support' | 'settings';

export type UserWithStats = Profile & { total_invested: number; total_withdrawn: number; active_investments: number };

type WithdrawalRequest = Transaction & {
  user_email: string;
  user_name: string;
  user_balance: number;
};

type SupportThread = {
  user_id: string;
  user_email: string;
  user_name: string;
  messages: SupportMessage[];
  unread: number;
  last_at: string;
};

type EditUser = {
  userId: string;
  full_name: string;
  phone_number: string;
  wallet_address: string;
  is_admin: boolean;
};

type InvestmentWithUser = Investment & {
  user_email?: string;
  user_name?: string;
  product_name?: string;
};

const EMPTY_PRODUCT = {
  name: '', description: '', price: '', profit_rate: '', duration_days: '', daily_profit: '', image_url: '', is_active: true,
};

function pd(val: string): number {
  return parseFloat(val.replace(',', '.'));
}

const TX_TYPE_TR: Record<string, string> = {
  deposit: 'Yatirma', withdrawal: 'Cekme', investment: 'Yatirim', profit: 'Kar', referral_bonus: 'Referans',
};
const STATUS_TR: Record<string, string> = {
  pending: 'Bekliyor', completed: 'Tamamlandi', failed: 'Basarisiz', rejected: 'Reddedildi',
};
const INV_STATUS_TR: Record<string, string> = {
  active: 'Aktif', completed: 'Tamamlandi', cancelled: 'Iptal',
};

type Props = {
  tab: AdminTab;
  products: Product[];
  users: UserWithStats[];
  allInvestments: InvestmentWithUser[];
  transactions: Transaction[];
  supportMessages: SupportMessage[];
  settingsForm: Record<string, string>;
  setSettingsForm: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setUsers: React.Dispatch<React.SetStateAction<UserWithStats[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  setSupportMessages: React.Dispatch<React.SetStateAction<SupportMessage[]>>;
  reloadWithdrawals: () => Promise<void>;
  approveWithdrawal: (tx: Transaction) => Promise<void>;
  rejectWithdrawal: (tx: Transaction) => Promise<void>;
};

export default function AdminTabs({
  tab, products, users, allInvestments, transactions, supportMessages,
  settingsForm, setSettingsForm, setProducts, setUsers, setTransactions,
  setSupportMessages, reloadWithdrawals, approveWithdrawal, rejectWithdrawal,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editBalance, setEditBalance] = useState<{ userId: string; value: string } | null>(null);
  const [savingBalance, setSavingBalance] = useState(false);
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [processingWithdrawal, setProcessingWithdrawal] = useState<string | null>(null);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<EditUser | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [txFilter, setTxFilter] = useState<string>('all');
  const [txSearch, setTxSearch] = useState('');
  const [invFilter, setInvFilter] = useState<string>('all');
  const [viewUser, setViewUser] = useState<UserWithStats | null>(null);

  function copyAddress(addr: string) {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 2000);
  }

  async function saveProduct() {
    if (!form.name || !form.price || !form.profit_rate || !form.duration_days) return;
    const priceVal = pd(form.price);
    const rateVal = pd(form.profit_rate);
    const daysVal = pd(form.duration_days);
    if (isNaN(priceVal) || isNaN(rateVal) || isNaN(daysVal) || priceVal <= 0 || daysVal <= 0) {
      alert('Gecersiz deger. Ondalik icin nokta veya virgul kullanabilirsiniz (ornek: 0.5 veya 0,5).');
      return;
    }
    const dailyRaw = form.daily_profit.trim();
    const dailyProfitVal = dailyRaw !== '' ? pd(dailyRaw) : null;
    if (dailyProfitVal !== null && isNaN(dailyProfitVal)) {
      alert('Gunluk kazanc icin gecerli bir sayi girin.');
      return;
    }
    setSaving(true);
    try {
      let finalImageUrl = form.image_url;
      if (pendingFile) {
        const uploaded = await uploadPendingFile();
        if (uploaded) finalImageUrl = uploaded;
        else if (finalImageUrl.startsWith('data:')) finalImageUrl = '';
        setPendingFile(null);
      }
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: priceVal,
        profit_rate: rateVal,
        duration_days: daysVal,
        image_url: finalImageUrl,
        is_active: form.is_active,
        daily_profit: dailyProfitVal,
      };
      const { error } = editId
        ? await supabase.from('products').update(payload).eq('id', editId)
        : await supabase.from('products').insert(payload);
      if (error) throw error;
      const { data, error: fetchErr } = await supabase.from('products').select('*').order('price');
      if (fetchErr) throw fetchErr;
      if (data) setProducts(data as Product[]);
      setShowForm(false); setEditId(null); setForm(EMPTY_PRODUCT);
    } catch (err) {
      alert('Kayit hatasi: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleProduct(id: string, active: boolean) {
    const { error } = await supabase.from('products').update({ is_active: !active }).eq('id', id);
    if (!error) setProducts((prev) => prev.map((pr) => pr.id === id ? { ...pr, is_active: !active } : pr));
  }

  function handleFileSelect(file: File) {
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) setForm((f) => ({ ...f, image_url: result }));
    };
    reader.readAsDataURL(file);
  }

  async function uploadPendingFile(): Promise<string | null> {
    if (!pendingFile) return null;
    setUploadingImage(true);
    try {
      const ext = (pendingFile.name.split('.').pop() ?? 'jpg').toLowerCase();
      const filename = `product-${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(filename, pendingFile, { contentType: pendingFile.type, upsert: true });
      if (error) { alert('Fotograf yuklenemedi: ' + error.message); return null; }
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(data.path);
      return urlData.publicUrl;
    } catch (e) {
      alert('Beklenmeyen hata: ' + String(e));
      return null;
    } finally {
      setUploadingImage(false);
    }
  }

  async function deleteProduct(id: string) {
    setDeletingProduct(id);
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert('Silme hatasi: ' + (err as Error).message);
    } finally {
      setDeletingProduct(null);
    }
  }

  function startEdit(product: Product) {
    setEditId(product.id);
    setForm({
      name: product.name, description: product.description,
      price: product.price.toString(), profit_rate: product.profit_rate.toString(),
      duration_days: product.duration_days.toString(), image_url: product.image_url || '',
      daily_profit: product.daily_profit != null ? product.daily_profit.toString() : '',
      is_active: product.is_active,
    });
    setShowForm(true);
  }

  async function saveBalance() {
    if (!editBalance) return;
    setSavingBalance(true);
    try {
      const val = pd(editBalance.value);
      if (!isNaN(val)) {
        const { error } = await supabase.from('profiles').update({ balance: val }).eq('id', editBalance.userId);
        if (error) throw error;
        setUsers((u) => u.map((usr) => usr.id === editBalance!.userId ? { ...usr, balance: val } : usr));
        await supabase.from('transactions').insert({
          user_id: editBalance.userId, type: 'deposit', amount: val,
          status: 'completed', description: 'Admin bakiye guncellemesi',
        });
      }
      setEditBalance(null);
    } catch (err) {
      alert('Bakiye guncelleme hatasi: ' + (err as Error).message);
    } finally {
      setSavingBalance(false);
    }
  }

  async function saveUser() {
    if (!editUser) return;
    setSavingUser(true);
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: editUser.full_name,
        phone_number: editUser.phone_number,
        wallet_address: editUser.wallet_address,
        is_admin: editUser.is_admin,
      }).eq('id', editUser.userId);
      if (error) throw error;
      setUsers((prev) => prev.map((u) => u.id === editUser.userId ? {
        ...u,
        full_name: editUser.full_name,
        phone_number: editUser.phone_number,
        wallet_address: editUser.wallet_address,
        is_admin: editUser.is_admin,
      } : u));
      setEditUser(null);
    } catch (err) {
      alert('Kullanici guncelleme hatasi: ' + (err as Error).message);
    } finally {
      setSavingUser(false);
    }
  }

  function startEditUser(u: UserWithStats) {
    setEditUser({
      userId: u.id,
      full_name: u.full_name,
      phone_number: u.phone_number || '',
      wallet_address: u.wallet_address || '',
      is_admin: u.is_admin,
    });
  }

  const threads: SupportThread[] = (() => {
    const map: Record<string, SupportThread> = {};
    supportMessages.forEach((msg) => {
      if (!msg.user_id) return;
      if (!map[msg.user_id]) {
        const u = users.find((usr) => usr.id === msg.user_id);
        map[msg.user_id] = {
          user_id: msg.user_id, user_email: u?.email || 'Bilinmiyor',
          user_name: u?.full_name || 'Isimsiz', messages: [], unread: 0, last_at: msg.created_at,
        };
      }
      map[msg.user_id].messages.push(msg);
      if (!msg.is_read && msg.sender === 'user') map[msg.user_id].unread++;
      if (msg.created_at > map[msg.user_id].last_at) map[msg.user_id].last_at = msg.created_at;
    });
    return Object.values(map).sort((a, b) => b.last_at.localeCompare(a.last_at));
  })();

  async function sendReply(userId: string) {
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      const { error } = await supabase.from('support_messages').insert({
        user_id: userId, sender: 'support', message: replyText.trim(), is_read: true,
      });
      if (error) throw error;
      await supabase.from('support_messages').update({ is_read: true }).eq('user_id', userId).eq('sender', 'user');
      const { data } = await supabase.from('support_messages').select('*').order('created_at', { ascending: true });
      if (data) setSupportMessages(data as SupportMessage[]);
      setReplyText('');
    } catch (err) {
      alert('Mesaj gonderme hatasi: ' + (err as Error).message);
    } finally {
      setSendingReply(false);
    }
  }

  async function saveSettings() {
    setSavingSettings(true);
    try {
      const results = await Promise.all(
        Object.entries(settingsForm).map(([key, value]) =>
          supabase.from('platform_settings').upsert({ key, value, updated_at: new Date().toISOString() })
        )
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    } catch (err) {
      alert('Ayarlar kaydedilemedi: ' + (err as Error).message);
    } finally {
      setSavingSettings(false);
    }
  }

  const activeThread = openThread ? threads.find((t) => t.user_id === openThread) : null;

  const pendingWithdrawals: WithdrawalRequest[] = transactions
    .filter((tx) => tx.type === 'withdrawal' && tx.status === 'pending')
    .map((tx) => {
      const u = users.find((usr) => usr.id === tx.user_id);
      return { ...tx, user_email: u?.email || 'Bilinmiyor', user_name: u?.full_name || 'Isimsiz', user_balance: u?.balance ?? 0 };
    });

  const filteredTransactions = transactions.filter((tx) => {
    if (txFilter !== 'all' && tx.type !== txFilter) return false;
    if (txSearch) {
      const u = users.find((usr) => usr.id === tx.user_id);
      const q = txSearch.toLowerCase();
      return (u?.full_name?.toLowerCase().includes(q)) || (u?.email?.toLowerCase().includes(q)) ||
        tx.description?.toLowerCase().includes(q) || String(tx.amount).includes(txSearch);
    }
    return true;
  });

  const filteredUsers = users.filter((u) => {
    if (!userSearch) return true;
    const s = userSearch.toLowerCase();
    return u.full_name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s) ||
      u.referral_code?.toLowerCase().includes(s) || u.phone_number?.includes(userSearch);
  });

  const filteredInvestments = allInvestments.filter((i) => invFilter === 'all' || i.status === invFilter);

  if (tab === 'products') return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-400">{products.length} urun</div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_PRODUCT); }}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-gray-950 text-sm font-semibold rounded-xl transition-all">
          <Plus size={15} /> Urun Ekle
        </button>
      </div>
      {showForm && (
        <div className="bg-gray-900/80 border border-amber-500/20 rounded-2xl p-6 mb-6">
          <h3 className="font-bold mb-5">{editId ? 'Urunu Duzenle' : 'Yeni Urun'}</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { key: 'name', label: 'Urun Adi', type: 'text', placeholder: 'Altin Paket' },
              { key: 'price', label: 'Fiyat (USDT)', type: 'number', placeholder: '500' },
              { key: 'profit_rate', label: 'Kar Orani (%)', type: 'number', placeholder: '18.5' },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">{field.label}</label>
                <input type={field.type} value={(form as Record<string, string | boolean>)[field.key] as string}
                  onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Sure (gun)</label>
              <input type="number" value={form.duration_days}
                onChange={(e) => setForm((f) => ({ ...f, duration_days: e.target.value }))}
                placeholder="30"
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <DollarSign size={12} />
                  Gunluk Ortalama Kar (USDT) <span className="text-gray-600 font-normal">(opsiyonel)</span>
                </span>
              </label>
              <input type="number" value={form.daily_profit}
                onChange={(e) => setForm((f) => ({ ...f, daily_profit: e.target.value }))}
                placeholder="3.50"
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                <span className="flex items-center gap-1.5"><Image size={12} />Urun Fotografı</span>
              </label>
              <div className="flex gap-2">
                <input type="url" value={form.image_url}
                  onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                  placeholder="https://... veya bilgisayardan yukle"
                  className="flex-1 bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-200 text-sm rounded-lg transition-all shrink-0">
                  {uploadingImage ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploadingImage ? 'Yukleniyor...' : 'PC\'den Sec'}
                </button>
              </div>
              {form.image_url && (
                <div className="mt-2 rounded-lg overflow-hidden w-24 h-16 border border-gray-700">
                  <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Aciklama</label>
              <textarea value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Urun aciklamasi..." rows={2}
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50 resize-none" />
            </div>
            <div className="sm:col-span-2">
              <button type="button" onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                className="flex items-center gap-2 text-sm text-gray-400">
                {form.is_active ? <ToggleRight size={22} className="text-emerald-400" /> : <ToggleLeft size={22} />}
                {form.is_active ? 'Aktif' : 'Pasif'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-5">
            <button onClick={saveProduct} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 text-sm font-semibold rounded-xl transition-all">
              {saving ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
              {editId ? 'Guncelle' : 'Kaydet'}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY_PRODUCT); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl transition-all">
              <X size={14} /> Iptal
            </button>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {products.map((p) => (
          <div key={p.id} className="flex items-center gap-4 bg-gray-900/70 border border-gray-800 rounded-xl px-5 py-4">
            {p.image_url && (
              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-gray-700">
                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{p.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">${p.price} USDT &bull; %{p.profit_rate} kar &bull; {p.duration_days} gun{p.daily_profit != null ? ` • $${Number(p.daily_profit).toFixed(2)}/gun` : ''}</div>
              {p.description && <div className="text-xs text-gray-600 mt-0.5 truncate">{p.description}</div>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => toggleProduct(p.id, p.is_active)} className="text-gray-500 hover:text-amber-400 transition-colors">
                {p.is_active ? <ToggleRight size={22} className="text-emerald-400" /> : <ToggleLeft size={22} />}
              </button>
              <button onClick={() => startEdit(p)} className="p-2 text-gray-500 hover:text-amber-400 hover:bg-gray-800 rounded-lg transition-all">
                <Package size={14} />
              </button>
              <button onClick={() => deleteProduct(p.id)} disabled={deletingProduct === p.id}
                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50">
                {deletingProduct === p.id ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (tab === 'users') return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Ad, email, telefon, referans kodu..."
            className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-amber-500/50" />
        </div>
        <div className="text-sm text-gray-400">{filteredUsers.length} kullanici</div>
      </div>

      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditUser(null)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <div className="flex items-center gap-2"><UserCog size={18} className="text-amber-400" /><h2 className="font-bold">Kullanici Duzenle</h2></div>
              <button onClick={() => setEditUser(null)} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Ad Soyad</label>
                <input type="text" value={editUser.full_name}
                  onChange={(e) => setEditUser({ ...editUser, full_name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Telefon Numarasi</label>
                <input type="tel" value={editUser.phone_number}
                  onChange={(e) => setEditUser({ ...editUser, phone_number: e.target.value })}
                  placeholder="+90 555 123 4567"
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">TRC20 Cuzdan Adresi</label>
                <input type="text" value={editUser.wallet_address}
                  onChange={(e) => setEditUser({ ...editUser, wallet_address: e.target.value })}
                  placeholder="T..."
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-amber-500/50" />
              </div>
              <div className="flex items-center justify-between bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3">
                <div>
                  <div className="text-sm font-semibold">Admin Yetkisi</div>
                  <div className="text-xs text-gray-500 mt-0.5">{editUser.is_admin ? 'Admin yetkisine sahip' : 'Normal kullanici'}</div>
                </div>
                <button onClick={() => setEditUser({ ...editUser, is_admin: !editUser.is_admin })}>
                  {editUser.is_admin ? <ToggleRight size={28} className="text-amber-400" /> : <ToggleLeft size={28} className="text-gray-600" />}
                </button>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-800 flex items-center gap-3">
              <button onClick={saveUser} disabled={savingUser}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 text-sm font-semibold rounded-xl transition-all">
                {savingUser ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
                {savingUser ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
              <button onClick={() => setEditUser(null)} className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl transition-all">Iptal</button>
            </div>
          </div>
        </div>
      )}

      {viewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setViewUser(null)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <div className="flex items-center gap-2"><Eye size={18} className="text-amber-400" /><h2 className="font-bold">Kullanici Detayi</h2></div>
              <button onClick={() => setViewUser(null)} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"><X size={18} /></button>
            </div>
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400 font-bold text-lg">
                  {(viewUser.full_name?.[0] || '?').toUpperCase()}
                </div>
                <div>
                  <div className="font-bold">{viewUser.full_name || 'Isimsiz'}</div>
                  <div className="text-xs text-gray-400">{viewUser.email}</div>
                </div>
                {viewUser.is_admin && <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5 ml-auto">Admin</span>}
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-800/60 rounded-lg p-3"><div className="text-xs text-gray-500">Bakiye</div><div className="font-bold text-emerald-400">${Number(viewUser.balance).toFixed(2)}</div></div>
                <div className="bg-gray-800/60 rounded-lg p-3"><div className="text-xs text-gray-500">Yatirim</div><div className="font-bold text-amber-400">${viewUser.total_invested.toFixed(2)}</div></div>
                <div className="bg-gray-800/60 rounded-lg p-3"><div className="text-xs text-gray-500">Cekim</div><div className="font-bold text-rose-400">${viewUser.total_withdrawn.toFixed(2)}</div></div>
                <div className="bg-gray-800/60 rounded-lg p-3"><div className="text-xs text-gray-500">Aktif Yatirim</div><div className="font-bold text-sky-400">{viewUser.active_investments}</div></div>
              </div>
              <div className="border-t border-gray-700/50 pt-3 space-y-2">
                <div className="flex items-center gap-2 text-sm"><Hash size={13} className="text-gray-500" /><span className="text-gray-500">Ref:</span><span className="font-mono text-amber-400">{viewUser.referral_code}</span></div>
                {viewUser.phone_number && <div className="flex items-center gap-2 text-sm"><LinkIcon size={13} className="text-gray-500" /><span className="text-gray-500">Tel:</span><span className="text-emerald-400">{viewUser.phone_number}</span></div>}
                {viewUser.wallet_address && <div className="flex items-center gap-2 text-sm"><Wallet size={13} className="text-gray-500 shrink-0" /><span className="text-gray-500 shrink-0">TRC20:</span><span className="font-mono text-sky-400 truncate">{viewUser.wallet_address}</span></div>}
                <div className="flex items-center gap-2 text-sm"><CalendarDays size={13} className="text-gray-500" /><span className="text-gray-500">Kayit:</span><span className="text-gray-300">{new Date(viewUser.created_at).toLocaleDateString('tr-TR')}</span></div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-800 flex gap-3">
              <button onClick={() => { startEditUser(viewUser); setViewUser(null); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-gray-950 text-sm font-semibold rounded-xl transition-all">
                <UserCog size={14} /> Duzenle
              </button>
              <button onClick={() => setViewUser(null)} className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl transition-all">Kapat</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filteredUsers.map((u) => (
          <div key={u.id} className="bg-gray-900/70 border border-gray-800 rounded-xl px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{u.full_name || 'Isimsiz'}</span>
                  {u.is_admin && <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5">Admin</span>}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{u.email}</div>
                <div className="text-xs text-gray-600 mt-0.5">Ref: {u.referral_code}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {editBalance?.userId === u.id ? (
                  <div className="flex items-center gap-2">
                    <input type="number" value={editBalance.value}
                      onChange={(e) => setEditBalance({ userId: u.id, value: e.target.value })}
                      className="w-28 bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-amber-500/50" />
                    <button onClick={saveBalance} disabled={savingBalance} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30">
                      {savingBalance ? <Loader size={12} className="animate-spin" /> : <Check size={12} />}
                    </button>
                    <button onClick={() => setEditBalance(null)} className="p-1.5 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700"><X size={12} /></button>
                  </div>
                ) : (
                  <button onClick={() => setEditBalance({ userId: u.id, value: u.balance.toString() })}
                    className="flex items-center gap-1.5 text-sm font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5 hover:bg-emerald-500/20 transition-all">
                    ${Number(u.balance).toFixed(2)} <Package size={11} />
                  </button>
                )}
                <button onClick={() => setViewUser(u)} className="p-2 text-gray-500 hover:text-sky-400 hover:bg-gray-800 rounded-lg transition-all"><Eye size={14} /></button>
                <button onClick={() => startEditUser(u)} className="p-2 text-gray-500 hover:text-amber-400 hover:bg-gray-800 rounded-lg transition-all"><UserCog size={14} /></button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 bg-gray-800/60 rounded-lg px-3 py-1.5">
                <TrendingUp size={12} className="text-amber-400" /><span className="text-xs text-gray-400">Yatirim:</span><span className="text-xs font-semibold text-amber-400">${u.total_invested.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-gray-800/60 rounded-lg px-3 py-1.5">
                <TrendingDown size={12} className="text-rose-400" /><span className="text-xs text-gray-400">Cekim:</span><span className="text-xs font-semibold text-rose-400">${u.total_withdrawn.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-gray-800/60 rounded-lg px-3 py-1.5">
                <BarChart3 size={12} className="text-sky-400" /><span className="text-xs text-gray-400">Aktif:</span><span className="text-xs font-semibold text-sky-400">{u.active_investments}</span>
              </div>
              {u.wallet_address ? (
                <div className="flex items-center gap-1.5 bg-gray-800/60 rounded-lg px-3 py-1.5 overflow-hidden">
                  <Wallet size={12} className="text-sky-400 shrink-0" /><span className="text-xs text-gray-400 shrink-0">TRC20:</span>
                  <span className="text-xs font-mono text-sky-400 truncate max-w-[160px]">{u.wallet_address}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-gray-800/60 rounded-lg px-3 py-1.5">
                  <Wallet size={12} className="text-gray-600" /><span className="text-xs text-gray-600">TRC20 yok</span>
                </div>
              )}
              {u.phone_number ? (
                <div className="flex items-center gap-1.5 bg-gray-800/60 rounded-lg px-3 py-1.5">
                  <LinkIcon size={12} className="text-emerald-400 shrink-0" /><span className="text-xs text-gray-400 shrink-0">Tel:</span>
                  <span className="text-xs text-emerald-400">{u.phone_number}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-gray-800/60 rounded-lg px-3 py-1.5">
                  <LinkIcon size={12} className="text-gray-600" /><span className="text-xs text-gray-600">Telefon yok</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (tab === 'investments') return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1 bg-gray-900/60 border border-gray-800 rounded-xl p-1">
          {[{ key: 'all', label: 'Tumu' }, { key: 'active', label: 'Aktif' }, { key: 'completed', label: 'Tamamlanan' }].map((f) => (
            <button key={f.key} onClick={() => setInvFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${invFilter === f.key ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-gray-400 hover:text-white'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="text-sm text-gray-400">{filteredInvestments.length} yatirim</div>
      </div>
      <div className="space-y-2">
        {filteredInvestments.length === 0 ? (
          <div className="text-center py-16 text-gray-500"><TrendingUp size={40} className="mx-auto mb-3 opacity-20" /><p className="text-sm">Yatirim bulunamadi.</p></div>
        ) : filteredInvestments.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between bg-gray-900/70 border border-gray-800 rounded-xl px-5 py-3.5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{inv.product_name}</span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${inv.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : inv.status === 'completed' ? 'bg-sky-500/20 text-sky-400' : 'bg-gray-500/20 text-gray-400'}`}>
                  {INV_STATUS_TR[inv.status] || inv.status}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{inv.user_name} &bull; {inv.user_email}</div>
              <div className="text-xs text-gray-600 mt-0.5">{new Date(inv.start_date).toLocaleDateString('tr-TR')} - {new Date(inv.end_date).toLocaleDateString('tr-TR')}</div>
            </div>
            <div className="text-right shrink-0 ml-4">
              <div className="font-semibold text-sm text-amber-400">${Number(inv.amount).toFixed(2)}</div>
              <div className="text-xs text-emerald-400">+${Number(inv.profit_amount).toFixed(2)} kar</div>
              <div className="text-xs text-gray-500">%{inv.profit_rate}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (tab === 'transactions') return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" value={txSearch} onChange={(e) => setTxSearch(e.target.value)}
            placeholder="Kullanici, aciklama, tutar..."
            className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-amber-500/50" />
        </div>
        <div className="flex gap-1 bg-gray-900/60 border border-gray-800 rounded-xl p-1 flex-wrap">
          {[{ key: 'all', label: 'Tumu' }, { key: 'deposit', label: 'Yatirma' }, { key: 'withdrawal', label: 'Cekme' }, { key: 'investment', label: 'Yatirim' }, { key: 'profit', label: 'Kar' }, { key: 'referral_bonus', label: 'Referans' }].map((f) => (
            <button key={f.key} onClick={() => setTxFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${txFilter === f.key ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-gray-400 hover:text-white'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="text-sm text-gray-400">{filteredTransactions.length} islem</div>
      </div>
      <div className="space-y-2">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-16 text-gray-500"><DollarSign size={40} className="mx-auto mb-3 opacity-20" /><p className="text-sm">Islem bulunamadi.</p></div>
        ) : filteredTransactions.map((tx) => {
          const u = users.find((usr) => usr.id === tx.user_id);
          return (
            <div key={tx.id} className="flex items-center justify-between bg-gray-900/70 border border-gray-800 rounded-xl px-5 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{TX_TYPE_TR[tx.type] || tx.type}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${tx.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : tx.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : tx.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {STATUS_TR[tx.status] || tx.status}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{u?.full_name || 'Isimsiz'} &bull; {u?.email || 'Bilinmiyor'}</div>
                {tx.description && <div className="text-xs text-gray-500 mt-0.5">{tx.description}</div>}
                {tx.withdrawal_address && <div className="text-xs text-sky-400 font-mono mt-0.5 truncate max-w-[300px]">{tx.withdrawal_address}</div>}
                <div className="text-xs text-gray-600 mt-0.5">{new Date(tx.created_at).toLocaleString('tr-TR')}</div>
              </div>
              <div className="text-right shrink-0 ml-4">
                <div className={`font-semibold text-sm ${['deposit', 'profit', 'referral_bonus'].includes(tx.type) ? 'text-emerald-400' : tx.type === 'withdrawal' ? 'text-rose-400' : 'text-amber-400'}`}>
                  {['deposit', 'profit', 'referral_bonus'].includes(tx.type) ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (tab === 'withdrawals') return (
    <div className="space-y-4">
      {pendingWithdrawals.length === 0 ? (
        <div className="text-center py-16 text-gray-500"><ArrowUpRight size={40} className="mx-auto mb-3 opacity-20" /><p className="text-sm">Bekleyen para cekme talebi yok.</p></div>
      ) : pendingWithdrawals.map((tx) => (
        <div key={tx.id} className="bg-gray-900/70 border border-amber-500/20 rounded-2xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{tx.user_name}</span>
                <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5">Bekliyor</span>
              </div>
              <div className="text-xs text-gray-400">{tx.user_email}</div>
              <div className="text-xs text-gray-600 mt-0.5">{new Date(tx.created_at).toLocaleString('tr-TR')}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-amber-400">${Number(tx.amount).toFixed(2)}</div>
              <div className="text-xs text-gray-500 mt-0.5">Bakiye: <span className="text-gray-300">${Number(tx.user_balance).toFixed(2)}</span></div>
            </div>
          </div>
          {tx.withdrawal_address ? (
            <div className="flex items-center gap-3 bg-sky-950/40 border border-sky-500/30 rounded-xl px-4 py-3 mb-4">
              <Wallet size={15} className="text-sky-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-sky-500/80 font-medium mb-0.5">USDT TRC20 Odeme Adresi</div>
                <div className="text-sm font-mono text-sky-300 break-all select-all">{tx.withdrawal_address}</div>
              </div>
              <button onClick={() => copyAddress(tx.withdrawal_address!)} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 hover:text-sky-300 border border-sky-500/30 text-xs font-medium transition-all">
                {copiedAddr === tx.withdrawal_address ? <><Check size={12} className="text-emerald-400" /> Kopyalandi</> : <><Copy size={12} /> Kopyala</>}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <span className="text-xs text-red-400">Bu talep icin cekim adresi girilmemis.</span>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => { setProcessingWithdrawal(tx.id); approveWithdrawal(tx).finally(() => setProcessingWithdrawal(null)); }} disabled={processingWithdrawal === tx.id}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
              {processingWithdrawal === tx.id ? <Loader size={14} className="animate-spin" /> : <Check size={14} />} Onayla
            </button>
            <button onClick={() => { setProcessingWithdrawal(tx.id); rejectWithdrawal(tx).finally(() => setProcessingWithdrawal(null)); }} disabled={processingWithdrawal === tx.id}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
              {processingWithdrawal === tx.id ? <Loader size={14} className="animate-spin" /> : <X size={14} />} Reddet
            </button>
          </div>
        </div>
      ))}
      {transactions.filter((tx) => tx.type === 'withdrawal' && tx.status !== 'pending').length > 0 && (
        <div>
          <div className="text-xs text-gray-600 uppercase tracking-wider mb-3 mt-6">Islem Gormus Talepler</div>
          <div className="space-y-2">
            {transactions.filter((tx) => tx.type === 'withdrawal' && tx.status !== 'pending').map((tx) => {
              const u = users.find((usr) => usr.id === tx.user_id);
              return (
                <div key={tx.id} className="flex items-center justify-between bg-gray-900/50 border border-gray-800 rounded-xl px-5 py-3">
                  <div>
                    <div className="text-sm font-medium">{u?.full_name || 'Isimsiz'}</div>
                    <div className="text-xs text-gray-500">{u?.email}</div>
                    <div className="text-xs text-gray-600">{new Date(tx.created_at).toLocaleString('tr-TR')}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm text-gray-300">${Number(tx.amount).toFixed(2)}</div>
                    <div className={`text-xs font-medium mt-0.5 ${tx.status === 'completed' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.status === 'completed' ? 'Onaylandi' : 'Reddedildi'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  if (tab === 'support') return (
    <div className="flex gap-4 h-[560px]">
      <div className="w-64 shrink-0 flex flex-col gap-1 overflow-y-auto">
        {threads.length === 0 && <div className="text-center text-gray-600 text-sm py-8">Henuz mesaj yok</div>}
        {threads.map((t) => (
          <button key={t.user_id} onClick={() => setOpenThread(t.user_id)}
            className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${openThread === t.user_id ? 'bg-amber-500/10 border-amber-500/20 text-white' : 'bg-gray-900/60 border-gray-800 hover:border-gray-700 text-gray-300'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm truncate">{t.user_name}</span>
              {t.unread > 0 && <span className="w-5 h-5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shrink-0">{t.unread}</span>}
            </div>
            <div className="text-xs text-gray-500 truncate mt-0.5">{t.user_email}</div>
            <div className="text-xs text-gray-600 mt-0.5">{new Date(t.last_at).toLocaleDateString('tr-TR')}</div>
          </button>
        ))}
      </div>
      <div className="flex-1 flex flex-col bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden">
        {!activeThread ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-600 text-sm"><MessageSquare size={32} className="mx-auto mb-2 opacity-30" />Bir konusma secin</div>
          </div>
        ) : (
          <>
            <div className="px-5 py-3 border-b border-gray-800 flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400 font-bold text-sm">
                {(activeThread.user_name[0] || '?').toUpperCase()}
              </div>
              <div><div className="font-semibold text-sm">{activeThread.user_name}</div><div className="text-xs text-gray-500">{activeThread.user_email}</div></div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {activeThread.messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'support' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm ${msg.sender === 'support' ? 'bg-amber-500/20 text-amber-100 rounded-br-sm' : 'bg-gray-800 text-gray-200 rounded-bl-sm'}`}>
                    <div>{msg.message}</div>
                    <div className="text-[10px] opacity-50 mt-1">{new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-gray-800 flex gap-2">
              <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) sendReply(activeThread.user_id); }}
                placeholder="Yanit yaz..."
                className="flex-1 bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50" />
              <button onClick={() => sendReply(activeThread.user_id)} disabled={sendingReply || !replyText.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-gray-950 text-sm font-semibold rounded-xl transition-all flex items-center gap-1.5">
                {sendingReply ? <Loader size={13} className="animate-spin" /> : <ChevronRight size={13} />} Gonder
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // Settings tab
  return (
    <div className="max-w-xl space-y-6">
      <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-2"><AlertTriangle size={16} className="text-amber-400" /><h3 className="font-bold">Site Durumu</h3></div>
        <p className="text-xs text-gray-500 mb-5">Bakim modu acikken ziyaretciler siteye erisemez. Admin hesabiniz her zaman erisebilir.</p>
        <div className="flex items-center justify-between bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-white">Bakim Modu</div>
            <div className={`text-xs mt-0.5 font-medium ${settingsForm['maintenance_mode'] === 'true' ? 'text-amber-400' : 'text-emerald-400'}`}>
              {settingsForm['maintenance_mode'] === 'true' ? 'Aktif - Site kapali' : 'Kapali - Site acik'}
            </div>
          </div>
          <button onClick={() => setSettingsForm((s) => ({ ...s, maintenance_mode: s['maintenance_mode'] === 'true' ? 'false' : 'true' }))} className="ml-4 shrink-0">
            {settingsForm['maintenance_mode'] === 'true' ? <ToggleRight size={32} className="text-amber-400" /> : <ToggleLeft size={32} className="text-gray-600" />}
          </button>
        </div>
      </div>

      <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5"><Globe size={16} className="text-amber-400" /><h3 className="font-bold">Site Bilgileri</h3></div>
        <div className="space-y-4">
          {[{ key: 'site_name', label: 'Site Adi', placeholder: 'CheapMarket', type: 'text' }, { key: 'site_logo_url', label: 'Logo URL', placeholder: 'https://...', type: 'url' }].map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">{f.label}</label>
              <input type={f.type} value={settingsForm[f.key] || ''} onChange={(e) => setSettingsForm((s) => ({ ...s, [f.key]: e.target.value }))} placeholder={f.placeholder}
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Site Aciklamasi</label>
            <textarea value={settingsForm['site_description'] || ''} onChange={(e) => setSettingsForm((s) => ({ ...s, site_description: e.target.value }))}
              placeholder="Guvenilir dropshipping yatirim platformu" rows={2}
              className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50 resize-none" />
          </div>
        </div>
      </div>

      <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5"><DollarSign size={16} className="text-amber-400" /><h3 className="font-bold">Finansal Ayarlar</h3></div>
        <div className="space-y-4">
          {[{ key: 'min_deposit', label: 'Min. Yatirma (USDT)', placeholder: '10' }, { key: 'min_withdrawal', label: 'Min. Cekim (USDT)', placeholder: '10' }, { key: 'referral_rate', label: 'Referans Komisyonu (%)', placeholder: '10' }].map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">{f.label}</label>
              <input type="number" value={settingsForm[f.key] || ''} onChange={(e) => setSettingsForm((s) => ({ ...s, [f.key]: e.target.value }))} placeholder={f.placeholder}
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5"><Wallet size={16} className="text-amber-400" /><h3 className="font-bold">Yatirma Adresi</h3></div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">USDT TRC20 Adresi</label>
        <input type="text" value={settingsForm['deposit_address'] || ''} onChange={(e) => setSettingsForm((s) => ({ ...s, deposit_address: e.target.value }))}
          placeholder="TRC20 cuzdan adresinizi girin..." className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-amber-500/50" />
        <p className="text-xs text-gray-600 mt-1.5">Kullanicilar bu adrese USDT (TRC20) gonderecek.</p>
      </div>

      <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5"><LinkIcon size={16} className="text-amber-400" /><h3 className="font-bold">Sosyal Medya</h3></div>
        <div className="space-y-4">
          {[
            { key: 'social_whatsapp', label: 'WhatsApp', placeholder: 'https://wa.me/...' },
            { key: 'social_telegram', label: 'Telegram', placeholder: 'https://t.me/...' },
            { key: 'social_instagram', label: 'Instagram', placeholder: 'https://instagram.com/...' },
            { key: 'social_twitter', label: 'Twitter / X', placeholder: 'https://twitter.com/...' },
            { key: 'social_youtube', label: 'YouTube', placeholder: 'https://youtube.com/...' },
            { key: 'social_tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@...' },
          ].map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">{field.label}</label>
              <input type="url" value={settingsForm[field.key] || ''} onChange={(e) => setSettingsForm((s) => ({ ...s, [field.key]: e.target.value }))} placeholder={field.placeholder}
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5"><MessageSquare size={16} className="text-amber-400" /><h3 className="font-bold">Iletisim</h3></div>
        <div className="space-y-4">
          {[{ key: 'support_email', label: 'Destek E-postasi', placeholder: 'support@example.com', type: 'email' }, { key: 'company_name', label: 'Firma Adi', placeholder: 'CheapMarket Ltd.', type: 'text' }].map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">{f.label}</label>
              <input type={f.type} value={settingsForm[f.key] || ''} onChange={(e) => setSettingsForm((s) => ({ ...s, [f.key]: e.target.value }))} placeholder={f.placeholder}
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50" />
            </div>
          ))}
        </div>
      </div>

      <button onClick={saveSettings} disabled={savingSettings}
        className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 text-sm font-semibold rounded-xl transition-all">
        {savingSettings ? <Loader size={14} className="animate-spin" /> : <Check size={14} />} Tum Ayarlari Kaydet
      </button>
    </div>
  );
}
