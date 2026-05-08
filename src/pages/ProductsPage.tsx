import { useEffect, useState } from 'react';
import {
  TrendingUp, ShoppingCart, CheckCircle, AlertCircle, Loader,
  Lock, Star, Zap, Package, ChevronRight, Trash2, X, AlertTriangle, Gift, BarChart2
} from 'lucide-react';
import { supabase, Product, Investment } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Props = {
  onNavigate: (page: 'home' | 'products' | 'dashboard' | 'auth' | 'admin') => void;
};

const FALLBACK_IMAGES = [
  'https://images.pexels.com/photos/393047/pexels-photo-393047.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/934070/pexels-photo-934070.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/439391/pexels-photo-439391.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/4483610/pexels-photo-4483610.jpeg?auto=compress&cs=tinysrgb&w=600',
];

function tierLabel(rate: number) {
  if (rate >= 30) return { label: 'Elite', color: 'bg-cyan-500 text-gray-950' };
  if (rate >= 20) return { label: 'Premium', color: 'bg-amber-500 text-gray-950' };
  if (rate >= 15) return { label: 'Popular', color: 'bg-emerald-500 text-gray-950' };
  return null;
}


type ActiveInvestmentWithProduct = Investment & { products: Product };

export default function ProductsPage({ onNavigate }: Props) {
  const { user, profile, refreshProfile, hasReferralBonus } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [activeInvestments, setActiveInvestments] = useState<ActiveInvestmentWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; ok: boolean; msg: string } | null>(null);
  const [removeConfirm, setRemoveConfirm] = useState<ActiveInvestmentWithProduct | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    const fetches: Promise<void>[] = [
      supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('price')
        .then(({ data }) => { if (data) setProducts(data as Product[]); }),
    ];

    if (user) {
      fetches.push(
        supabase
          .from('investments')
          .select('*, products(*)')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .then(({ data }) => {
            if (data) setActiveInvestments(data as ActiveInvestmentWithProduct[]);
          })
      );
    }

    Promise.all(fetches).then(() => setLoading(false));
  }, [user]);

  async function handleBuy(product: Product) {
    if (!user || !profile) {
      onNavigate('auth');
      return;
    }

    setBuying(product.id);
    setFeedback(null);

    try {
      const endDate = new Date();
      endDate.setTime(endDate.getTime() + product.duration_days * 24 * 60 * 60 * 1000);
      const effectiveRate = hasReferralBonus ? product.profit_rate + 10 : product.profit_rate;
      const profitAmount = product.daily_profit != null
        ? Number(product.daily_profit) * product.duration_days
        : (product.price * effectiveRate) / 100;

      const { error: invError } = await supabase.from('investments').insert({
        user_id: user.id,
        product_id: product.id,
        amount: product.price,
        profit_rate: effectiveRate,
        profit_amount: profitAmount,
        end_date: endDate.toISOString(),
        status: 'active',
      });

      if (invError) {
        setFeedback({ id: product.id, ok: false, msg: 'Could not create investment. Please try again.' });
        return;
      }

      const { error: balError } = await supabase
        .from('profiles')
        .update({ balance: profile.balance - product.price })
        .eq('id', user.id);

      if (balError) {
        setFeedback({ id: product.id, ok: false, msg: 'Investment recorded but balance update failed. Please refresh.' });
        return;
      }

      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'investment',
        amount: product.price,
        status: 'completed',
        description: `${product.name} yatirimi`,
      });

      const { data: invData } = await supabase
        .from('investments')
        .select('*, products(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (invData) {
        setActiveInvestments(
          (invData as ActiveInvestmentWithProduct[]).filter((inv) => inv.products != null)
        );
      }

      await refreshProfile();
      setFeedback({ id: product.id, ok: true, msg: 'Yatirim basariyla tamamlandi!' });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({ id: product.id, ok: false, msg: 'Beklenmeyen hata: ' + (err as Error).message });
    } finally {
      setBuying(null);
    }
  }

  async function handleEarlyWithdraw() {
    if (!user || !profile || !removeConfirm) return;
    setRemoving(true);
    try {
      const penalty = removeConfirm.amount * 0.2;
      const refund = removeConfirm.amount - penalty;

      const { error: invErr } = await supabase.from('investments').update({ status: 'cancelled' }).eq('id', removeConfirm.id);
      if (invErr) throw invErr;
      const { error: balErr } = await supabase.from('profiles').update({ balance: profile.balance + refund }).eq('id', user.id);
      if (balErr) throw balErr;
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'withdrawal',
        amount: refund,
        status: 'completed',
        description: `Early removal — 20% penalty applied (${removeConfirm.products?.name ?? 'product'})`,
      });

      const { data: invData } = await supabase
        .from('investments')
        .select('*, products(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (invData) {
        setActiveInvestments(
          (invData as ActiveInvestmentWithProduct[]).filter((inv) => inv.products != null)
        );
      }
      await refreshProfile();
      setRemoveConfirm(null);
    } catch {
      // keep modal open so user can retry
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white pt-20 pb-16 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="py-12 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-4">
            <TrendingUp size={14} className="text-amber-400" />
            <span className="text-amber-400 text-sm font-medium">Invest with USDT TRC20</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Product Catalog</h1>
          <p className="text-gray-400 max-w-lg mx-auto text-sm leading-relaxed">
            Invest in products and profit is automatically calculated and added to your balance at the end of the period.
          </p>

          {user && profile ? (
            <div className="flex flex-col items-center gap-2 mt-5">
              <div className="inline-flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-5 py-2.5 text-sm">
                <span className="text-gray-500">Available Balance:</span>
                <span className="text-emerald-400 font-bold text-base">${profile.balance.toFixed(2)} USDT</span>
              </div>
              {hasReferralBonus && profile.referral_bonus_expires_at && (
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2 text-sm text-emerald-400">
                  <Gift size={14} />
                  <span className="font-semibold">Referral Bonus Active</span>
                  <span className="text-emerald-500/70 text-xs">
                    — +10% on all products · expires {new Date(profile.referral_bonus_expires_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 mt-5 bg-amber-500/5 border border-amber-500/20 rounded-xl px-5 py-2.5 text-sm text-amber-400/80">
              <Lock size={13} />
              Sign in to purchase
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader size={32} className="animate-spin text-amber-400" />
          </div>
        ) : (
          <>
            {/* Active investments section */}
            {user && (
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-5">
                  <Package size={16} className="text-amber-400" />
                  <h2 className="text-base font-semibold">Your Shelf</h2>
                  {activeInvestments.length > 0 && (
                    <span className="ml-1 bg-amber-500/15 text-amber-400 text-xs font-semibold px-2 py-0.5 rounded-full border border-amber-500/20">
                      {activeInvestments.length}
                    </span>
                  )}
                </div>

                {activeInvestments.length === 0 ? (
                  <div className="flex items-center gap-4 bg-gray-900/50 border border-gray-800 border-dashed rounded-2xl px-6 py-8">
                    <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center shrink-0">
                      <Package size={22} className="text-gray-600" />
                    </div>
                    <div>
                      <p className="text-gray-400 font-medium text-sm">Your shelf is empty</p>
                      <p className="text-gray-600 text-xs mt-0.5">Invest in a product below to start building your shelf.</p>
                    </div>
                  </div>
                ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeInvestments.map((inv) => {
                    const idx = products.findIndex(p => p.id === inv.product_id);
                    const img = inv.products?.image_url || FALLBACK_IMAGES[idx >= 0 ? idx % FALLBACK_IMAGES.length : 0];

                    return (
                      <div
                        key={inv.id}
                        className="bg-gray-900 border border-emerald-500/20 rounded-2xl overflow-hidden flex gap-0 relative"
                      >
                        {/* Left accent bar */}
                        <div className="w-1 bg-gradient-to-b from-emerald-400 to-emerald-600 shrink-0" />

                        <div className="flex flex-col w-full p-4">
                          <div className="flex items-start gap-3 mb-3">
                            <img
                              src={img}
                              alt={inv.products?.name}
                              className="w-12 h-12 rounded-xl object-cover shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm leading-snug truncate">
                                {inv.products?.name ?? 'Product'}
                              </div>
                              <div className="text-gray-500 text-xs mt-0.5">
                                ${inv.amount.toFixed(2)} invested
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-emerald-400 font-bold text-sm">+${inv.profit_amount.toFixed(2)}</div>
                              <div className="text-gray-600 text-xs">profit</div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-gray-800">
                            <span className="text-emerald-500/70 font-medium">{inv.profit_rate}% return</span>
                            <button
                              onClick={() => setRemoveConfirm(inv)}
                              className="flex items-center gap-1 text-red-400/70 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={11} />
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            )}

            {/* Divider if both sections visible */}
            {user && (
              <div className="flex items-center gap-4 mb-8">
                <div className="flex-1 h-px bg-gray-800" />
                <span className="text-gray-600 text-xs font-medium uppercase tracking-wider">All Products</span>
                <div className="flex-1 h-px bg-gray-800" />
              </div>
            )}

            {/* Product catalog */}
            {products.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <TrendingUp size={48} className="mx-auto mb-4 opacity-20" />
                <p>No active products yet.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product, idx) => {
                  const canAfford = profile ? profile.balance >= product.price : false;
                  const locked = user ? !canAfford : false;
                  const isBuying = buying === product.id;
                  const fb = feedback?.id === product.id ? feedback : null;
                  const effectiveRate = hasReferralBonus ? product.profit_rate + 10 : product.profit_rate;
                  const badge = tierLabel(effectiveRate);
                  const img = product.image_url || FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length];
                  const profitEarnings = product.daily_profit != null
                    ? Number(product.daily_profit) * product.duration_days
                    : (product.price * effectiveRate) / 100;
                  const totalReturn = product.price + profitEarnings;

                  return (
                    <div
                      key={product.id}
                      className={`relative bg-gray-900 border rounded-2xl overflow-hidden flex flex-col transition-all duration-200 ${
                        locked
                          ? 'border-gray-800 opacity-60 grayscale'
                          : 'border-gray-800 hover:border-amber-500/30 hover:-translate-y-1 shadow-lg hover:shadow-amber-500/5'
                      }`}
                    >
                      {/* Image */}
                      <div className="relative h-44 overflow-hidden shrink-0">
                        <img
                          src={img}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />

                        {hasReferralBonus && !locked && (
                          <div className="absolute top-3 left-3 flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500 text-gray-950">
                            <Star size={10} fill="currentColor" />
                            +10% Bonus
                          </div>
                        )}
                        {!hasReferralBonus && badge && !locked && (
                          <div className={`absolute top-3 left-3 flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${badge.color}`}>
                            <Star size={10} fill="currentColor" />
                            {badge.label}
                          </div>
                        )}

                        {locked && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-950/40 backdrop-blur-[1px]">
                            <div className="flex items-center gap-1.5 bg-gray-900/90 border border-gray-700 rounded-full px-3 py-1.5 text-xs text-gray-400">
                              <Lock size={11} />
                              Insufficient Balance
                            </div>
                          </div>
                        )}

                        <div className="absolute bottom-3 right-3 bg-gray-950/80 backdrop-blur-sm border border-gray-700/60 rounded-xl px-3 py-2 text-right">
                          <div className="text-amber-400 font-black text-xl leading-none">${product.price}</div>
                          <div className="text-gray-500 text-xs mt-0.5">USDT</div>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-5 flex flex-col flex-1">
                        <h3 className="font-bold text-base mb-1 leading-snug">{product.name}</h3>
                        {product.description && (
                          <p className="text-gray-500 text-xs leading-relaxed mb-4">{product.description}</p>
                        )}

                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <div className={`rounded-xl p-2.5 text-center ${hasReferralBonus ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-gray-800/60'}`}>
                            {hasReferralBonus ? (
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-gray-500 line-through text-xs">{product.profit_rate}%</span>
                                <span className="text-emerald-400 font-bold text-sm">{effectiveRate}%</span>
                              </div>
                            ) : (
                              <div className="text-emerald-400 font-bold text-sm">{effectiveRate}%</div>
                            )}
                            <div className="text-gray-600 text-xs mt-0.5">Profit</div>
                          </div>
                          <div className="bg-gray-800/60 rounded-xl p-2.5 text-center">
                            <div className="text-amber-400 font-bold text-sm">
                              +${profitEarnings.toFixed(2)}
                            </div>
                            <div className="text-gray-600 text-xs mt-0.5">Earnings</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-800/40 rounded-lg px-3 py-2 mb-2">
                          <span>Total Return</span>
                          <span className="text-emerald-400 font-semibold">${totalReturn.toFixed(2)}</span>
                        </div>

                        {product.daily_profit != null && (
                          <div className="flex items-center justify-between text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-4">
                            <span className="flex items-center gap-1.5 text-amber-300">
                              <BarChart2 size={11} />
                              Gunluk Ortalama Kar
                            </span>
                            <span className="text-amber-400 font-bold">+${Number(product.daily_profit).toFixed(2)}</span>
                          </div>
                        )}
                        {product.daily_profit == null && <div className="mb-4" />}

                        {fb && (
                          <div className={`flex items-center gap-2 text-xs px-3 py-2.5 rounded-lg mb-3 ${
                            fb.ok
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {fb.ok
                              ? <CheckCircle size={13} className="shrink-0" />
                              : <AlertCircle size={13} className="shrink-0" />
                            }
                            {fb.msg}
                          </div>
                        )}

                        <div className="mt-auto">
                          {!user ? (
                            <button
                              onClick={() => onNavigate('auth')}
                              className="w-full py-3 rounded-xl text-sm font-semibold bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-gray-950 border border-amber-500/30 hover:border-amber-500 transition-all"
                            >
                              Sign In
                            </button>
                          ) : locked ? (
                            <button
                              disabled
                              className="w-full py-3 rounded-xl text-sm font-medium bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              <Lock size={13} />
                              Insufficient Balance
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBuy(product)}
                              disabled={isBuying}
                              className="w-full py-3 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-gray-950 transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35 flex items-center justify-center gap-2"
                            >
                              {isBuying ? (
                                <div className="w-4 h-4 border-2 border-gray-950/30 border-t-gray-950 rounded-full animate-spin" />
                              ) : (
                                <>
                                  <ShoppingCart size={15} />
                                  Add to Shelf
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Info bar */}
        <div className="mt-10 grid sm:grid-cols-3 gap-4">
          {[
            { icon: <Zap size={14} className="text-amber-400" />, text: 'Profit is automatically added at the end of the period' },
            { icon: <TrendingUp size={14} className="text-emerald-400" />, text: 'You can buy multiple packages as long as your balance allows' },
            { icon: <ChevronRight size={14} className="text-sky-400" />, text: 'Visit your Dashboard to deposit balance' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 text-xs text-gray-500">
              {item.icon}
              {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* Early removal confirmation modal */}
      {removeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/15 border border-red-500/30 rounded-xl flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} className="text-red-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Remove from Shelf</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{removeConfirm.products?.name ?? 'Product'}</p>
                </div>
              </div>
              <button onClick={() => setRemoveConfirm(null)} className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-5">
              <p className="text-sm text-red-300 font-medium mb-1">20% Early Removal Penalty</p>
              <p className="text-xs text-red-400/80 leading-relaxed">
                If you remove this product before the investment period ends, you will incur a <strong className="text-red-300">20% loss</strong> on your invested amount. Only the remaining 80% will be refunded to your balance.
              </p>
            </div>

            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 mb-5 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Invested Amount</span>
                <span className="font-semibold">${removeConfirm.amount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-red-400">Penalty (20%)</span>
                <span className="font-semibold text-red-400">- ${(removeConfirm.amount * 0.2).toFixed(2)}</span>
              </div>
              <div className="h-px bg-gray-700" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-400 font-medium">You Will Receive</span>
                <span className="font-bold text-emerald-400">${(removeConfirm.amount * 0.8).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setRemoveConfirm(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleEarlyWithdraw}
                disabled={removing}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500/80 hover:bg-red-500 disabled:opacity-50 text-white border border-red-500/30 transition-all flex items-center justify-center gap-2"
              >
                {removing ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {removing ? 'Removing...' : 'Remove Anyway'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
