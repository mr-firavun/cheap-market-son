import { useState, useEffect } from 'react';
import { Shield, TrendingUp, Users, Zap, Clock, DollarSign, ArrowRight, CheckCircle, Star, Package, ShoppingBag, ChevronDown, X, MessageCircle, Mail, FileText, AlertTriangle, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import logoSrc from '../assets/logo.jpeg';


type Props = {
  onNavigate: (page: 'home' | 'products' | 'dashboard' | 'auth' | 'admin') => void;
};

type ModalType = 'privacy' | 'terms' | 'risk' | 'faq' | 'contact' | null;

const FAQ_ITEMS = [
  {
    q: 'How do I earn money?',
    a: 'You purchase products on our platform at wholesale prices. We sell them at retail. When a sale is made, the difference between the wholesale and retail price is automatically credited to your balance. No action required on your part.',
  },
  {
    q: 'What is the minimum investment?',
    a: 'You can start with the lowest-priced product in our catalog. There is no mandatory minimum — choose any product that fits your budget.',
  },
  {
    q: 'When can I withdraw my money?',
    a: 'You can request a withdrawal of your accumulated profit at any time. Requests are typically sent to your USDT TRC20 address within 24–48 hours.',
  },
  {
    q: 'Do I need to manage inventory or shipping?',
    a: 'No. All logistics, inventory management, customer service, and returns are handled by our team. You simply add products to your shelf — we take care of the rest.',
  },
  {
    q: 'How does the referral system work?',
    a: 'When you register, you receive a unique referral code. When someone signs up using your code and makes an investment, 10% of their earnings is added to your balance as a referral bonus.',
  },
  {
    q: 'Can I pay with something other than USDT TRC20?',
    a: 'Currently only USDT TRC20 (Tron network) is supported. This ensures all transactions are transparent and secure on the blockchain. We cannot accept responsibility for transfers made on the wrong network.',
  },
  {
    q: 'Is my account secure?',
    a: 'We use an encrypted session infrastructure to protect your account. We strongly recommend not sharing your wallet address or login credentials with anyone. If you notice anything suspicious, contact our support team immediately.',
  },
  {
    q: 'How many products can I buy?',
    a: 'You can purchase as many products as you like. Each product has its own profit rate and duration. Diversifying your portfolio creates a more balanced income stream.',
  },
];

const PRIVACY_CONTENT = `**Privacy Policy**
Last updated: January 2026

At CheapMarket, we respect the privacy of our users and are committed to protecting your personal data.

**Data We Collect**
During registration, we collect basic identity and payment information such as your name, email address, and USDT TRC20 wallet address. Transaction records related to your platform usage are stored on secure servers.

**Use of Data**
The data we collect is used solely to manage your account, process profit payments, and provide support services. Your data is never shared with third parties for commercial purposes.

**Security**
All data is transmitted over encrypted connections (HTTPS). Payment transactions are recorded transparently and immutably on the blockchain infrastructure.

**Cookies**
Cookies are used minimally for session management and to improve platform performance. You may disable cookies in your browser settings; however, some features may not work as a result.

**Data Retention**
Your data is stored while your account is active. Upon a request to delete your account, your personal data will be deleted subject to applicable legal obligations.

**Contact**
For privacy-related questions, please reach out through our live support channel.`;

const TERMS_CONTENT = `**Terms of Service**
Last updated: January 2026

By using the CheapMarket platform, you agree to the following terms.

**Platform Definition**
CheapMarket is a digital platform that offers wholesale participation in dropshipping products. Users purchase products; sales and logistics are managed by the platform.

**Account Registration**
You must be at least 18 years old to register. You agree to provide accurate and up-to-date information and to maintain the security of your account.

**Payments & Withdrawals**
All payments are processed via the USDT TRC20 network. Responsibility for transfers made to the wrong network or address lies with the user. Withdrawal requests are processed within 24–48 business hours.

**Prohibited Activities**
Money laundering, fraud, unauthorized access to another user's account, and any action that threatens platform security are strictly prohibited. Violations may result in account suspension.

**Changes**
The platform reserves the right to update these terms without prior notice. The current terms are accessible at all times on the platform.

**Governing Law**
These terms are interpreted and governed in accordance with the laws of the Republic of Turkey.`;

const RISK_CONTENT = `**Risk Disclosure**
Last updated: January 2026

Please read the following risk disclosure carefully before participating in CheapMarket.

**General Warning**
Dropshipping activities may vary depending on factors such as market conditions, supply chain fluctuations, and changes in consumer demand. Past profit rates do not guarantee future earnings.

**Cryptocurrency Risks**
Although USDT TRC20 is a stablecoin, cryptocurrency transfers are irreversible. Transfers made to incorrect addresses or networks may result in permanent loss. We recommend verifying your wallet address before every transfer.

**Profit Rates**
The profit rates shown on the platform are calculated based on current product performance. These rates may vary depending on market conditions and the product.

**Only Invest What You Can Afford**
We advise against investing funds you may urgently need or cannot afford to lose. Acting with a responsible investment mindset is in your best interest.

**Platform Guarantee**
CheapMarket guarantees payments to its members and provides transparent records of all transactions. If you have any doubts or issues, please contact our support team.

**Questions**
Our live support line is available 24/7 for risk-related questions.`;

function Modal({ type, onClose }: { type: ModalType; onClose: () => void }) {
  if (!type) return null;

  const configs: Record<Exclude<ModalType, null>, { title: string; icon: React.ReactNode; content: string }> = {
    privacy: {
      title: 'Privacy Policy',
      icon: <Lock size={20} className="text-sky-400" />,
      content: PRIVACY_CONTENT,
    },
    terms: {
      title: 'Terms of Service',
      icon: <FileText size={20} className="text-amber-400" />,
      content: TERMS_CONTENT,
    },
    risk: {
      title: 'Risk Disclosure',
      icon: <AlertTriangle size={20} className="text-orange-400" />,
      content: RISK_CONTENT,
    },
    faq: { title: '', icon: null, content: '' },
    contact: { title: '', icon: null, content: '' },
  };

  if (type === 'faq' || type === 'contact') return null;

  const cfg = configs[type];

  function renderContent(text: string) {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-bold text-white mt-5 mb-1 first:mt-0">{line.slice(2, -2)}</p>;
      }
      if (line.trim() === '') return <div key={i} className="h-1" />;
      return <p key={i} className="text-gray-400 text-sm leading-relaxed">{line}</p>;
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            {cfg.icon}
            <h2 className="font-bold text-lg">{cfg.title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 space-y-1">
          {renderContent(cfg.content)}
        </div>
      </div>
    </div>
  );
}

type SocialLinks = {
  social_whatsapp: string;
  social_telegram: string;
  social_instagram: string;
  social_twitter: string;
  social_youtube: string;
  social_tiktok: string;
};

export default function LandingPage({ onNavigate }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const [wpLink, setWpLink] = useState<string>('');
  const [socials, setSocials] = useState<SocialLinks>({ social_whatsapp: '', social_telegram: '', social_instagram: '', social_twitter: '', social_youtube: '', social_tiktok: '' });

  useEffect(() => {
    supabase
      .from('platform_settings')
      .select('key, value')
      .in('key', ['social_whatsapp', 'social_telegram', 'social_instagram', 'social_twitter', 'social_youtube', 'social_tiktok'])
      .then(({ data }) => {
        if (!data) return;
        const map: Partial<SocialLinks> = {};
        data.forEach((row) => { (map as Record<string, string>)[row.key] = row.value; });
        setSocials((prev) => ({ ...prev, ...map }));
        if (map.social_whatsapp) setWpLink(map.social_whatsapp);
      });
  }, []);

  function openWhatsApp() {
    if (wpLink) {
      window.open(wpLink, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Modal type={modal} onClose={() => setModal(null)} />

      {/* Hero */}
      <section className="relative pt-20 sm:pt-24 pb-16 sm:pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-emerald-500/5 pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-48 sm:w-72 h-48 sm:h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 sm:px-4 py-1.5 mb-5 sm:mb-6">
              <ShoppingBag size={13} className="text-amber-400 shrink-0" />
              <span className="text-amber-400 text-xs sm:text-sm font-medium">Buy Products with USDT TRC20, Earn Profit</span>
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-5 sm:mb-6">
              Buy Products,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
                Automatic
              </span>{' '}
              Income<br className="hidden sm:block" />
              {' '}on Autopilot
            </h1>
            <p className="text-base sm:text-lg text-gray-400 mb-7 sm:mb-8 leading-relaxed px-2 sm:px-0">
              Invest in our dropshipping products with USDT TRC20 and have the profit from product sales automatically credited to your account.
              No inventory hassle, no shipping hassle — just earn.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
              <button
                onClick={() => onNavigate('auth')}
                className="inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-3.5 sm:py-4 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold rounded-xl transition-all shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 hover:-translate-y-0.5 text-sm sm:text-base"
              >
                Get Started
                <ArrowRight size={17} />
              </button>
              <button
                onClick={() => onNavigate('products')}
                className="inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-3.5 sm:py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition-all border border-gray-700 text-sm sm:text-base"
              >
                Browse Products
              </button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-12 sm:mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: 'Active Members', value: '3,847+' },
              { label: 'Total Paid Out', value: '$1.8M+' },
              { label: 'Products Sold', value: '14,600+' },
              { label: 'Uptime', value: '7/24' },
            ].map((stat) => (
              <div key={stat.label} className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 sm:p-5 text-center">
                <div className="text-xl sm:text-2xl font-bold text-amber-400">{stat.value}</div>
                <div className="text-xs sm:text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4 bg-gray-900/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">We buy products in bulk and offer them to you at wholesale — we handle the retail sales, and you collect your profit share.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: <ShoppingBag size={28} />,
                title: 'We Buy in Bulk',
                desc: 'We purchase large quantities of products from suppliers and store inventory in our own warehouse, so we always have products ready for you.',
              },
              {
                step: '02',
                icon: <Package size={28} />,
                title: 'You Buy Wholesale',
                desc: 'You add products from our platform to your shelf at wholesale prices. Load balance into your account and purchase any product you choose.',
              },
              {
                step: '03',
                icon: <TrendingUp size={28} />,
                title: 'We Sell, You Earn',
                desc: 'We fully manage retail sales of the products. Orders, shipping, and customer interactions are all our responsibility. When a sale happens, your profit share is automatically credited to your account.',
              },
            ].map((item) => (
              <div key={item.step} className="relative bg-gray-900/60 border border-gray-800 rounded-2xl p-8 hover:border-amber-500/30 transition-all group">
                <div className="absolute top-6 right-6 text-5xl font-black text-gray-800 group-hover:text-amber-500/10 transition-colors select-none">
                  {item.step}
                </div>
                <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-400 mb-5">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Why Choose Us?</h2>
            <p className="text-gray-400 max-w-xl mx-auto">The easiest way to earn dropshipping income with a reliable infrastructure and automated profit system.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Shield size={24} />,
                title: 'Secure Payment Infrastructure',
                desc: 'All transactions are transparent and secure on the USDT TRC20 blockchain.',
                color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
              },
              {
                icon: <Zap size={24} />,
                title: 'Automatic Profit Transfer',
                desc: 'When a product sells, your profit share is reflected in your balance without any action needed.',
                color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
              },
              {
                icon: <Users size={24} />,
                title: 'Referral Earnings',
                desc: 'Invite friends to the platform and earn a 10% commission on their profits.',
                color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
              },
              {
                icon: <Clock size={24} />,
                title: '24/7 Uninterrupted Access',
                desc: 'Manage your shelf anytime, from any device. Mobile-friendly dashboard.',
                color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
              },
              {
                icon: <TrendingUp size={24} />,
                title: 'High Profit Margins',
                desc: 'Net profit rates ranging from 8.5% to 35% depending on the product.',
                color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
              },
              {
                icon: <CheckCircle size={24} />,
                title: 'Transparent Transaction History',
                desc: 'Track every sale and payment in real time from your account dashboard.',
                color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
              },
            ].map((f) => (
              <div key={f.title} className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-all">
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-4 ${f.color}`}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why trust us + CTA */}
      <section className="py-20 px-4 bg-gray-900/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-5">
              <CheckCircle size={13} className="text-emerald-400" />
              <span className="text-emerald-400 text-sm font-medium">3,847+ members already earning</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Why You Can Start with Confidence</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              We don't make promises to convince you — we let the numbers speak. Every transaction on our platform is recorded, and every payment can be tracked in real time.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
            {[
              {
                value: '$1.8M+',
                label: 'Total Paid to Members',
                sub: 'On time, automated',
                color: 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
                textColor: 'text-amber-400',
              },
              {
                value: '14,600+',
                label: 'Successfully Completed Sales',
                sub: 'All shipping & customer handling done by us',
                color: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
                textColor: 'text-emerald-400',
              },
              {
                value: '100%',
                label: 'Payment Success Rate',
                sub: 'Not a single missed payment',
                color: 'from-sky-500/20 to-sky-500/5 border-sky-500/30',
                textColor: 'text-sky-400',
              },
              {
                value: '2 Years',
                label: 'Uninterrupted Service',
                sub: 'Robust infrastructure, zero downtime',
                color: 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
                textColor: 'text-amber-400',
              },
            ].map((item) => (
              <div key={item.label} className={`bg-gradient-to-b ${item.color} border rounded-2xl p-6 text-center`}>
                <div className={`text-3xl font-black mb-2 ${item.textColor}`}>{item.value}</div>
                <div className="text-white font-semibold text-sm mb-1">{item.label}</div>
                <div className="text-gray-500 text-xs">{item.sub}</div>
              </div>
            ))}
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-8 lg:p-12 mb-10">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <h3 className="text-2xl font-bold mb-4">How Your Earnings Are Generated</h3>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  We buy products in bulk from suppliers and offer them to you at <span className="text-white font-semibold">wholesale prices</span>. Once you purchase a product, we take over its retail sales. When a sale occurs, the difference between the wholesale and retail price — your <span className="text-amber-400 font-semibold">net profit share</span> — is automatically credited to your account.
                </p>
                <div className="space-y-3">
                  {[
                    { label: 'You purchase the product', detail: 'At the wholesale price' },
                    { label: 'We make the sale', detail: 'Shipping, customers, returns — all on us' },
                    { label: 'Profit instantly credited to your account', detail: 'No action required from you' },
                  ].map((step, i) => (
                    <div key={step.label} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500 text-gray-950 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div>
                        <div className="text-white text-sm font-medium">{step.label}</div>
                        <div className="text-gray-500 text-xs">{step.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-2">Sample Earnings Calculator</div>
                {[
                  { invest: 100, rate: 8.5, label: 'Small Budget' },
                  { invest: 500, rate: 18.5, label: 'Mid Budget' },
                  { invest: 2000, rate: 28.0, label: 'Large Budget' },
                ].map((ex) => {
                  const profit = (ex.invest * ex.rate) / 100;
                  const barWidth = Math.round((ex.rate / 35) * 100);
                  return (
                    <div key={ex.label} className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <span className="text-white font-semibold text-sm">{ex.label}</span>
                          <span className="text-gray-500 text-xs ml-2">${ex.invest} invested</span>
                        </div>
                        <div className="text-right">
                          <span className="text-emerald-400 font-bold text-sm">+${profit.toFixed(0)} profit</span>
                          <span className="text-gray-500 text-xs ml-2">{ex.rate}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-gray-600 text-center">* Rates shown are calculated based on the current product catalog.</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => onNavigate('auth')}
              className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-xl transition-all shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 hover:-translate-y-0.5"
            >
              Create a Free Account &amp; Browse Products
              <ArrowRight size={18} />
            </button>
            <p className="text-gray-600 text-xs mt-3">Registration is free. No credit card required.</p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">What Our Users Say</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Ahmed Y.', text: 'I bought a mid-range product and my profit share arrived much faster than expected. I trust the system.', rating: 5 },
              { name: 'Fatima K.', text: "I'm earning regular side income from the referral system. I invited my friends too, and we're all happy.", rating: 5 },
              { name: 'Michael S.', text: "I moved to premium products — the profit rates are genuinely high. Support resolves every issue within minutes.", rating: 5 },
            ].map((t) => (
              <div key={t.name} className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400 font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <span className="font-medium text-sm">{t.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4 bg-gray-900/40">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-400">Can't find your question here? Reach us via live support.</p>
          </div>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={i}
                className={`border rounded-xl overflow-hidden transition-all ${
                  openFaq === i ? 'border-amber-500/30 bg-gray-900/80' : 'border-gray-800 bg-gray-900/40'
                }`}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
                >
                  <span className={`font-medium text-sm ${openFaq === i ? 'text-amber-400' : 'text-white'}`}>
                    {item.q}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-gray-500 transition-transform ${openFaq === i ? 'rotate-180 text-amber-400' : ''}`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5">
                    <p className="text-gray-400 text-sm leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {wpLink && (
            <div className="mt-10 text-center">
              <p className="text-gray-500 text-sm mb-4">Couldn't find your question?</p>
              <button
                onClick={openWhatsApp}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-900/40"
              >
                <MessageCircle size={18} />
                Ask via WhatsApp
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Contact</h2>
            <p className="text-gray-400">Choose the fastest way to reach us.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {/* WhatsApp support */}
            <div className="bg-gray-900/60 border border-gray-800 hover:border-emerald-500/30 rounded-2xl p-7 transition-all group">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center mb-5">
                <MessageCircle size={24} className="text-emerald-400" />
              </div>
              <h3 className="font-bold text-lg mb-2">Live Support</h3>
              <p className="text-gray-400 text-sm mb-5 leading-relaxed">
                Reach our support team via WhatsApp 24/7. Questions are usually answered within a few minutes.
              </p>
              {wpLink ? (
                <button
                  onClick={openWhatsApp}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all"
                >
                  <MessageCircle size={15} />
                  Message on WhatsApp
                </button>
              ) : (
                <span className="text-xs text-gray-600">Support line coming soon.</span>
              )}
            </div>

            {/* General info */}
            <div className="bg-gray-900/60 border border-gray-800 hover:border-amber-500/30 rounded-2xl p-7 transition-all">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center mb-5">
                <Mail size={24} className="text-amber-400" />
              </div>
              <h3 className="font-bold text-lg mb-2">General Inquiries</h3>
              <p className="text-gray-400 text-sm mb-5 leading-relaxed">
                Send us a message for general questions about the platform, partnership proposals, and other topics.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                  Response time: 1–2 business days
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  For urgent matters, prefer live support
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gray-900/40">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-gradient-to-br from-amber-500/10 to-emerald-500/5 border border-amber-500/20 rounded-3xl p-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Build Your Shelf Today</h2>
            <p className="text-gray-400 mb-8">Join more than 3,847 members. Earn dropshipping profits with no inventory or shipping worries.</p>
            <button
              onClick={() => onNavigate('auth')}
              className="inline-flex items-center gap-2 px-10 py-4 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-xl transition-all shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 hover:-translate-y-0.5"
            >
              Create Free Account
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900/60 border-t border-gray-800 py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-9 w-9 rounded-full bg-white overflow-hidden ring-2 ring-amber-500/20 shrink-0">
                  <img src={logoSrc} alt="CheapMarket" className="h-9 w-9 object-cover" />
                </div>
                <span className="font-bold text-white text-sm">Cheap<span className="text-amber-400">Market</span></span>
              </div>
              <p className="text-gray-500 text-sm">Secure dropshipping investment platform powered by USDT TRC20.</p>
            </div>
            <div>
              <div className="font-semibold text-sm mb-3">Platform</div>
              <div className="space-y-2 text-sm text-gray-500">
                <div className="hover:text-gray-300 cursor-pointer transition-colors" onClick={() => onNavigate('home')}>Home</div>
                <div className="hover:text-gray-300 cursor-pointer transition-colors" onClick={() => onNavigate('products')}>Products</div>
                <div className="hover:text-gray-300 cursor-pointer transition-colors" onClick={() => onNavigate('auth')}>Create Account</div>
              </div>
            </div>
            <div>
              <div className="font-semibold text-sm mb-3">Support</div>
              <div className="space-y-2 text-sm text-gray-500">
                <button
                  onClick={() => { const el = document.getElementById('faq'); el?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="block hover:text-gray-300 transition-colors text-left"
                >
                  FAQ
                </button>
                <button
                  onClick={wpLink ? openWhatsApp : undefined}
                  className={`block transition-colors text-left ${wpLink ? 'hover:text-emerald-400 cursor-pointer' : 'cursor-default'}`}
                >
                  Live Support
                </button>
                <button
                  onClick={() => { const el = document.getElementById('contact'); el?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="block hover:text-gray-300 transition-colors text-left"
                >
                  Contact
                </button>
              </div>
            </div>
            <div>
              <div className="font-semibold text-sm mb-3">Legal</div>
              <div className="space-y-2 text-sm text-gray-500">
                <button onClick={() => setModal('privacy')} className="block hover:text-gray-300 transition-colors text-left">Privacy Policy</button>
                <button onClick={() => setModal('terms')} className="block hover:text-gray-300 transition-colors text-left">Terms of Service</button>
                <button onClick={() => setModal('risk')} className="block hover:text-gray-300 transition-colors text-left">Risk Disclosure</button>
              </div>
            </div>
          </div>
          {/* Social icons — always visible; tinted when link is set */}
          <div className="flex items-center justify-center gap-3 mb-6">
            {([
              { key: 'social_whatsapp', hover: 'hover:bg-emerald-500/20 hover:border-emerald-500/40 hover:text-emerald-400', svg: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> },
              { key: 'social_telegram', hover: 'hover:bg-sky-500/20 hover:border-sky-500/40 hover:text-sky-400', svg: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg> },
              { key: 'social_instagram', hover: 'hover:bg-pink-500/20 hover:border-pink-500/40 hover:text-pink-400', svg: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg> },
              { key: 'social_twitter', hover: 'hover:bg-gray-700 hover:border-gray-500 hover:text-white', svg: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.255 2.25H8.08l4.265 5.637 5.9-5.637zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
              { key: 'social_youtube', hover: 'hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400', svg: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
              { key: 'social_tiktok', hover: 'hover:bg-gray-700 hover:border-gray-500 hover:text-white', svg: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.77a4.85 4.85 0 0 1-1.01-.08z"/></svg> },
            ] as { key: keyof SocialLinks; hover: string; svg: React.ReactNode }[]).map(({ key, hover, svg }) => {
              const link = socials[key];
              return link ? (
                <a key={key} href={link} target="_blank" rel="noopener noreferrer"
                  className={`w-9 h-9 bg-gray-800 border border-gray-700 rounded-xl flex items-center justify-center text-gray-400 transition-all ${hover}`}>
                  {svg}
                </a>
              ) : (
                <span key={key} className="w-9 h-9 bg-gray-800/40 border border-gray-800 rounded-xl flex items-center justify-center text-gray-700">
                  {svg}
                </span>
              );
            })}
          </div>
          <div className="border-t border-gray-800 pt-6 text-center text-sm text-gray-600">
            © 2026 CheapMarket. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
