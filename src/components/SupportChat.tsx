import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, SupportMessage } from '../lib/supabase';

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

const AUTO_REPLIES: Array<{ keywords: string[]; reply: string }> = [
  { keywords: ['hello', 'hi', 'hey', 'merhaba', 'selam'], reply: 'Hello! How can I help you today?' },
  { keywords: ['balance', 'deposit', 'bakiye', 'para yatır', 'yatırma'], reply: 'To add funds, transfer USDT TRC20 to the address shown on your Dashboard page. Transactions are typically confirmed within 5–30 minutes.' },
  { keywords: ['profit', 'return', 'earnings', 'yield', 'kâr', 'kar', 'kazanç', 'getiri'], reply: 'Profit rates range from 8.5% to 35% depending on the plan. Once the plan duration ends, profits are automatically credited to your account.' },
  { keywords: ['withdraw', 'withdrawal', 'çekme', 'para çek'], reply: 'You can submit a withdrawal request from your Dashboard page. Requests are processed within 1–3 business days.' },
  { keywords: ['referral', 'invite', 'commission', 'referans', 'davet', 'komisyon'], reply: 'With our referral system, you earn a 10% commission on every profit your invited friends make. Copy your referral link from the Dashboard.' },
  { keywords: ['safe', 'secure', 'security', 'scam', 'güvenli', 'güvenlik', 'dolandırıcılık'], reply: 'Our platform is secured with blockchain technology. All transactions are recorded transparently on-chain.' },
  { keywords: ['plan', 'package', 'product', 'paket', 'ürün'], reply: 'We offer 5 investment plans starting from $50 up to $5,000. Visit the Invest page to explore all available plans.' },
  { keywords: ['thanks', 'thank you', 'ok', 'okay', 'teşekkür', 'sağol', 'tamam'], reply: "You're welcome! Feel free to ask if you have any other questions." },
];

const DEFAULT_REPLY = 'Understood. For more detailed assistance, our support team will get back to you as soon as possible. Our average response time is 2 hours.';

export default function SupportChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [wpLink, setWpLink] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'social_whatsapp')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setWpLink(data.value);
      });
  }, []);

  useEffect(() => {
    if (open && user && messages.length === 0) {
      const welcome: SupportMessage = {
        id: 'welcome',
        user_id: user.id,
        sender: 'support',
        message: 'Hello! Welcome to CheapMarket Support. How can I help you today?',
        is_read: true,
        created_at: new Date().toISOString(),
      };
      setMessages([welcome]);
    }
    if (!open && !user) {
      setMessages([]);
    }
  }, [open, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  function getAutoReply(text: string): string {
    const lower = text.toLowerCase();
    for (const item of AUTO_REPLIES) {
      if (item.keywords.some((kw) => lower.includes(kw))) {
        return item.reply;
      }
    }
    return DEFAULT_REPLY;
  }

  async function sendMessage() {
    if (!input.trim() || !user) return;
    const msg = input.trim();
    setInput('');

    const userMsg: SupportMessage = {
      id: Date.now().toString(),
      user_id: user.id,
      sender: 'user',
      message: msg,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setMessages((p) => [...p, userMsg]);

    await supabase.from('support_messages').insert({
      user_id: user.id,
      sender: 'user',
      message: msg,
    });

    setTyping(true);
    setTimeout(async () => {
      const reply = getAutoReply(msg);
      const botMsg: SupportMessage = {
        id: (Date.now() + 1).toString(),
        user_id: user.id,
        sender: 'support',
        message: reply,
        is_read: true,
        created_at: new Date().toISOString(),
      };
      setMessages((p) => [...p, botMsg]);
      setTyping(false);

      await supabase.from('support_messages').insert({
        user_id: user.id,
        sender: 'support',
        message: reply,
        is_read: true,
      });
    }, 1200);
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat panel — only for logged-in users */}
      {user && open && (
        <div className="w-80 sm:w-96 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between bg-gray-800 border-b border-gray-700 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center">
                <Bot size={16} className="text-amber-400" />
              </div>
              <div>
                <div className="text-sm font-semibold">CheapMarket Support</div>
                <div className="flex items-center gap-1 text-xs text-emerald-400">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  Online
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="h-72 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'support' && (
                  <div className="w-6 h-6 bg-amber-500/20 rounded-full flex items-center justify-center mr-2 mt-0.5 shrink-0">
                    <Bot size={12} className="text-amber-400" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-amber-500 text-gray-950 rounded-br-sm'
                    : 'bg-gray-800 text-gray-200 rounded-bl-sm'
                }`}>
                  {msg.message}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="w-6 h-6 bg-amber-500/20 rounded-full flex items-center justify-center mr-2 shrink-0">
                  <Bot size={12} className="text-amber-400" />
                </div>
                <div className="bg-gray-800 rounded-xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-700 px-3 py-3 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
              className="flex-1 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="p-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-gray-950 rounded-xl transition-all"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp floating button — always visible when link is configured */}
      {wpLink && (
        <a
          href={wpLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-14 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-400 shadow-2xl shadow-emerald-500/40 flex items-center justify-center transition-all hover:scale-105"
          title="Contact us on WhatsApp"
        >
          <WhatsAppIcon className="w-7 h-7 text-white" />
        </a>
      )}

      {/* In-app chat button — only for logged-in users */}
      {user && (
        <button
          onClick={() => setOpen(!open)}
          className={`w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all ${
            open ? 'bg-gray-700 hover:bg-gray-600' : 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/30'
          }`}
        >
          {open ? <X size={22} className="text-white" /> : <MessageCircle size={22} className="text-gray-950" />}
        </button>
      )}
    </div>
  );
}
