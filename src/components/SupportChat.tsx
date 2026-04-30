import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, SupportMessage } from '../lib/supabase';

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
  const bottomRef = useRef<HTMLDivElement>(null);

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

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-3 w-80 sm:w-96 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
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

      <button
        onClick={() => setOpen(!open)}
        className={`w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all ${
          open ? 'bg-gray-700 hover:bg-gray-600' : 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/30'
        }`}
      >
        {open ? <X size={22} className="text-white" /> : <MessageCircle size={22} className="text-gray-950" />}
      </button>
    </div>
  );
}
