import { useState, useEffect } from 'react';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Gift, AlertCircle, KeyRound, ArrowLeft, CheckCircle, Bot } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import logoSrc from '../assets/logo.jpeg';

type Props = {
  onNavigate: (page: 'home' | 'products' | 'dashboard' | 'auth' | 'admin') => void;
  initialMode?: 'login' | 'register' | 'forgot' | 'reset';
};

type Mode = 'login' | 'register' | 'forgot' | 'verify-code' | 'reset-password' | 'email-confirmation' | 'captcha';

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateMathQuestion(): { question: string; answer: number } {
  const ops = ['+', '-', '*'] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number;
  if (op === '+') { a = Math.floor(Math.random() * 20) + 1; b = Math.floor(Math.random() * 20) + 1; }
  else if (op === '-') { a = Math.floor(Math.random() * 20) + 10; b = Math.floor(Math.random() * 10) + 1; }
  else { a = Math.floor(Math.random() * 9) + 2; b = Math.floor(Math.random() * 9) + 2; }
  const answer = op === '+' ? a + b : op === '-' ? a - b : a * b;
  const symbol = op === '*' ? '×' : op;
  return { question: `${a} ${symbol} ${b} = ?`, answer };
}

export default function AuthPage({ onNavigate, initialMode }: Props) {
  const { signIn, signUp, completeSignUp } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode === 'forgot' ? 'forgot' : initialMode === 'reset' ? 'verify-code' : 'login');
  const [showPass, setShowPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [success, setSuccess] = useState('');

  // Main form
  const [form, setForm] = useState({ email: '', password: '', fullName: '', referralCode: '' });

  // Forgot / reset flow
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotEmailError, setForgotEmailError] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [pendingResetEmail, setPendingResetEmail] = useState('');

  // Captcha (signup anti-bot)
  const [captcha, setCaptcha] = useState<{ question: string; answer: number } | null>(null);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaError, setCaptchaError] = useState('');

  useEffect(() => {
    // Pre-fill referral code from URL
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) setForm((p) => ({ ...p, referralCode: ref }));
  }, []);

  function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  }

  function update(key: keyof typeof form, val: string) {
    setForm((p) => ({ ...p, [key]: val }));
    setError('');
    if (key === 'email') setEmailError('');
  }

  function handleEmailBlur() {
    if (!form.email) return;
    if (!form.email.includes('@')) {
      setEmailError('Please enter a valid email address. The "@" symbol is missing.');
    } else if (!isValidEmail(form.email)) {
      setEmailError('Invalid email format. Example: user@example.com');
    } else {
      setEmailError('');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!isValidEmail(form.email)) {
      setEmailError(!form.email.includes('@')
        ? 'Please enter a valid email address. The "@" symbol is missing.'
        : 'Invalid email format. Example: user@example.com');
      setLoading(false);
      return;
    }

    if (mode === 'login') {
      const { error } = await signIn(form.email, form.password);
      setLoading(false);
      if (error) {
        const msg = (error as Error).message?.toLowerCase() ?? '';
        if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
          setError('Please confirm your email address before signing in. Check your inbox for the confirmation link.');
        } else {
          setError('Incorrect email or password.');
        }
      } else {
        onNavigate('dashboard');
      }
    } else {
      if (!form.fullName.trim()) { setError('Full name is required.'); setLoading(false); return; }
      if (form.password.length < 6) { setError('Password must be at least 6 characters.'); setLoading(false); return; }
      setLoading(false);
      setCaptcha(generateMathQuestion());
      setCaptchaInput('');
      setCaptchaError('');
      setMode('captcha');
    }
  }

  async function handleCaptchaSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCaptchaError('');
    if (!captcha) return;
    if (parseInt(captchaInput, 10) !== captcha.answer) {
      setCaptchaError('Wrong answer. Please try again.');
      setCaptcha(generateMathQuestion());
      setCaptchaInput('');
      return;
    }
    setLoading(true);
    const { error } = await completeSignUp(form.email, form.password, form.fullName, form.referralCode || undefined);
    setLoading(false);
    if (error) {
      setCaptchaError('Registration failed. This email may already be in use.');
      return;
    }
    onNavigate('dashboard');
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setForgotEmailError('');
    setError('');
    if (!isValidEmail(forgotEmail)) {
      setForgotEmailError('Please enter a valid email address.');
      return;
    }
    setLoading(true);

    // Check if email exists in profiles
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', forgotEmail.trim().toLowerCase())
      .maybeSingle();

    if (!profileData) {
      setLoading(false);
      setForgotEmailError('No account found with this email address.');
      return;
    }

    // Generate and store reset code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await supabase.from('password_reset_codes').insert({
      email: forgotEmail.trim().toLowerCase(),
      code,
      expires_at: expiresAt,
      used: false,
    });

    setPendingResetEmail(forgotEmail.trim().toLowerCase());
    setLoading(false);
    setMode('verify-code');
    setSuccess(`A verification code has been sent to your email address. (Valid for 15 minutes)`);
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!verifyCode.trim()) { setError('Please enter the verification code.'); return; }
    setLoading(true);

    const now = new Date().toISOString();
    const { data } = await supabase
      .from('password_reset_codes')
      .select('id, code')
      .eq('email', pendingResetEmail)
      .eq('used', false)
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data || data.code !== verifyCode.trim()) {
      setLoading(false);
      setError('Invalid or expired code. Please try again.');
      return;
    }

    setLoading(false);
    setSuccess('');
    setMode('reset-password');
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== newPasswordConfirm) { setError('Passwords do not match.'); return; }
    setLoading(true);

    // Mark all unused codes for this email as used
    await supabase
      .from('password_reset_codes')
      .update({ used: true })
      .eq('email', pendingResetEmail)
      .eq('used', false);

    const { error: rpcError } = await supabase.rpc('reset_user_password', {
      p_email: pendingResetEmail,
      p_new_password: newPassword,
    });

    setLoading(false);

    if (rpcError) {
      setError('Password could not be updated. Please try again.');
      return;
    }

    setSuccess('Your password has been updated successfully. You can now sign in.');
    setTimeout(() => {
      setMode('login');
      setSuccess('');
      setPendingResetEmail('');
      setVerifyCode('');
      setNewPassword('');
      setNewPasswordConfirm('');
    }, 2500);
  }

  function switchAuthMode(m: 'login' | 'register') {
    setMode(m);
    setError('');
    setEmailError('');
    setSuccess('');
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 pt-20 pb-10">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-emerald-500/5 pointer-events-none" />
      <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-amber-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <button onClick={() => onNavigate('home')} className="inline-flex items-center gap-2 group">
            <div className="h-14 w-14 rounded-full bg-white overflow-hidden ring-2 ring-amber-500/30 mx-auto">
              <img src={logoSrc} alt="CheapMarket" className="h-14 w-14 object-cover" />
            </div>
          </button>
        </div>

        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-2xl">

          {/* ── LOGIN / REGISTER ── */}
          {(mode === 'login' || mode === 'register') && (
            <>
              <div className="flex bg-gray-800/60 rounded-xl p-1 mb-8">
                <button onClick={() => switchAuthMode('login')}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${mode === 'login' ? 'bg-amber-500 text-gray-950 shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                  Sign In
                </button>
                <button onClick={() => switchAuthMode('register')}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${mode === 'register' ? 'bg-amber-500 text-gray-950 shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                  Register
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input type="text" value={form.fullName} onChange={(e) => update('fullName', e.target.value)}
                        placeholder="Full Name"
                        className="w-full bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all"
                        required />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${emailError ? 'text-red-400' : 'text-gray-500'}`} />
                    <input type="text" value={form.email} onChange={(e) => update('email', e.target.value)} onBlur={handleEmailBlur}
                      placeholder="example@email.com"
                      className={`w-full bg-gray-800/60 border text-white placeholder-gray-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 transition-all ${emailError ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-700 focus:border-amber-500/60 focus:ring-amber-500/30'}`}
                      required />
                  </div>
                  {emailError && (
                    <div className="flex items-start gap-1.5 mt-1.5">
                      <AlertCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-400">{emailError}</p>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-sm font-medium text-gray-300">Password</label>
                    {mode === 'login' && (
                      <button type="button" onClick={() => { setMode('forgot'); setError(''); setSuccess(''); setForgotEmail(form.email); }}
                        className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
                        Forgot password
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type={showPass ? 'text' : 'password'} value={form.password} onChange={(e) => update('password', e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500 rounded-xl pl-10 pr-12 py-3 text-sm focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all"
                      required />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {mode === 'register' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Referral Code <span className="text-gray-500 font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <Gift size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input type="text" value={form.referralCode} onChange={(e) => update('referralCode', e.target.value)}
                        placeholder="Referral code"
                        className="w-full bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all" />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-red-400">
                    <AlertCircle size={14} className="shrink-0" /> {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-950 font-semibold rounded-xl transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 mt-2">
                  {loading
                    ? <div className="w-5 h-5 border-2 border-gray-950/30 border-t-gray-950 rounded-full animate-spin" />
                    : <>{mode === 'login' ? 'Sign In' : 'Create Account'}<ArrowRight size={16} /></>}
                </button>
              </form>

              {mode === 'register' && (
                <p className="text-center text-xs text-gray-600 mt-5 leading-relaxed">
                  By registering, you agree to our <span className="text-gray-400">Terms of Service</span> and <span className="text-gray-400">Privacy Policy</span>.
                </p>
              )}
            </>
          )}

          {/* ── CAPTCHA (robot check) ── */}
          {mode === 'captcha' && captcha && (
            <div className="py-2">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bot size={28} className="text-amber-400" />
                </div>
                <h2 className="font-bold text-xl mb-1">Robot Musunuz?</h2>
                <p className="text-gray-400 text-sm">Devam etmek için aşağıdaki soruyu cevaplayın.</p>
              </div>

              <form onSubmit={handleCaptchaSubmit} className="space-y-5">
                <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-5 text-center">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Matematik Sorusu</p>
                  <p className="text-3xl font-bold text-white">{captcha.question}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Cevabınız</label>
                  <input
                    type="number"
                    value={captchaInput}
                    onChange={(e) => { setCaptchaInput(e.target.value); setCaptchaError(''); }}
                    placeholder="Cevabı girin"
                    autoFocus
                    className="w-full bg-gray-800/60 border border-gray-700 text-white placeholder-gray-600 rounded-xl px-4 py-3.5 text-center text-2xl font-mono focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all"
                    required
                  />
                </div>

                {captchaError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-red-400">
                    <AlertCircle size={14} className="shrink-0" /> {captchaError}
                  </div>
                )}

                <button type="submit" disabled={loading || !captchaInput}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-950 font-semibold rounded-xl transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40">
                  {loading
                    ? <div className="w-5 h-5 border-2 border-gray-950/30 border-t-gray-950 rounded-full animate-spin" />
                    : <>Hesap Oluştur <ArrowRight size={16} /></>}
                </button>
              </form>

              <button
                type="button"
                onClick={() => switchAuthMode('register')}
                className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                <ArrowLeft size={14} /> Geri Dön
              </button>
            </div>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {mode === 'forgot' && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setMode('login')} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <h2 className="font-bold text-lg">Forgot Password</h2>
                  <p className="text-xs text-gray-500">A verification code will be sent to your email</p>
                </div>
              </div>

              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Your Email Address</label>
                  <div className="relative">
                    <Mail size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${forgotEmailError ? 'text-red-400' : 'text-gray-500'}`} />
                    <input type="text" value={forgotEmail} onChange={(e) => { setForgotEmail(e.target.value); setForgotEmailError(''); }}
                      placeholder="example@email.com"
                      className={`w-full bg-gray-800/60 border text-white placeholder-gray-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 transition-all ${forgotEmailError ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-700 focus:border-amber-500/60 focus:ring-amber-500/30'}`}
                      required />
                  </div>
                  {forgotEmailError && (
                    <div className="flex items-start gap-1.5 mt-1.5">
                      <AlertCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-400">{forgotEmailError}</p>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-red-400">
                    <AlertCircle size={14} className="shrink-0" /> {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 font-semibold rounded-xl transition-all">
                  {loading
                    ? <div className="w-5 h-5 border-2 border-gray-950/30 border-t-gray-950 rounded-full animate-spin" />
                    : <>Send Verification Code <ArrowRight size={16} /></>}
                </button>
              </form>
            </>
          )}

          {/* ── VERIFY CODE ── */}
          {mode === 'verify-code' && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => { setMode('forgot'); setSuccess(''); setError(''); }} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <h2 className="font-bold text-lg">Verify Code</h2>
                  <p className="text-xs text-gray-500">Sent to {pendingResetEmail}</p>
                </div>
              </div>

              {success && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-start gap-2 text-sm text-amber-300 mb-4">
                  <KeyRound size={14} className="shrink-0 mt-0.5" />
                  <span>{success}</span>
                </div>
              )}

              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">6-Digit Verification Code</label>
                  <input
                    type="text"
                    value={verifyCode}
                    onChange={(e) => { setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full bg-gray-800/60 border border-gray-700 text-white placeholder-gray-600 rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all"
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-red-400">
                    <AlertCircle size={14} className="shrink-0" /> {error}
                  </div>
                )}

                <button type="submit" disabled={loading || verifyCode.length < 6}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 font-semibold rounded-xl transition-all">
                  {loading
                    ? <div className="w-5 h-5 border-2 border-gray-950/30 border-t-gray-950 rounded-full animate-spin" />
                    : <>Confirm Code <ArrowRight size={16} /></>}
                </button>
              </form>
            </>
          )}

          {/* ── RESET PASSWORD ── */}
          {mode === 'reset-password' && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle size={16} className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Set New Password</h2>
                  <p className="text-xs text-gray-500">Identity verified</p>
                </div>
              </div>

              {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-emerald-300 mb-4">
                  <CheckCircle size={14} className="shrink-0" /> {success}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type={showNewPass ? 'text' : 'password'} value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                      placeholder="At least 6 characters"
                      className="w-full bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500 rounded-xl pl-10 pr-12 py-3 text-sm focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all"
                      required />
                    <button type="button" onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type={showNewPass ? 'text' : 'password'} value={newPasswordConfirm}
                      onChange={(e) => { setNewPasswordConfirm(e.target.value); setError(''); }}
                      placeholder="Re-enter new password"
                      className={`w-full bg-gray-800/60 border text-white placeholder-gray-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 transition-all ${newPasswordConfirm && newPassword !== newPasswordConfirm ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-700 focus:border-amber-500/60 focus:ring-amber-500/30'}`}
                      required />
                  </div>
                  {newPasswordConfirm && newPassword !== newPasswordConfirm && (
                    <p className="text-xs text-red-400 mt-1.5">Passwords do not match.</p>
                  )}
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-red-400">
                    <AlertCircle size={14} className="shrink-0" /> {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 font-semibold rounded-xl transition-all shadow-lg shadow-amber-500/25">
                  {loading
                    ? <div className="w-5 h-5 border-2 border-gray-950/30 border-t-gray-950 rounded-full animate-spin" />
                    : <>Update Password <ArrowRight size={16} /></>}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
