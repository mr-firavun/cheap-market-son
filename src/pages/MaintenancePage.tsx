import { TrendingUp, Clock, Bell } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-amber-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 text-center max-w-lg w-full">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-amber-500/30">
            <TrendingUp size={36} strokeWidth={2.5} className="text-gray-950" />
          </div>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-full px-4 py-1.5 mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
          </span>
          <span className="text-amber-400 text-xs font-semibold tracking-wide uppercase">Bakım Modu</span>
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
          Çok Yakında
          <span className="block text-amber-400">Hizmetinizdeyiz</span>
        </h1>

        <p className="text-gray-400 text-base leading-relaxed mb-10">
          Platformumuzu sizin için daha iyi hale getirmek amacıyla kısa bir bakım çalışması yapıyoruz.
          En kısa sürede geri döneceğiz.
        </p>

        {/* Info cards */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5 text-left">
            <div className="w-9 h-9 bg-amber-500/15 rounded-xl flex items-center justify-center mb-3">
              <Clock size={17} className="text-amber-400" />
            </div>
            <div className="text-sm font-semibold text-white mb-1">Kısa Süre</div>
            <div className="text-xs text-gray-500">Bakım çalışması en kısa sürede tamamlanacak</div>
          </div>
          <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5 text-left">
            <div className="w-9 h-9 bg-emerald-500/15 rounded-xl flex items-center justify-center mb-3">
              <Bell size={17} className="text-emerald-400" />
            </div>
            <div className="text-sm font-semibold text-white mb-1">Verileriniz Güvende</div>
            <div className="text-xs text-gray-500">Tüm yatırım ve bakiyeleriniz korunmaktadır</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">Bakım durumu</span>
            <span className="text-xs font-semibold text-amber-400">Devam ediyor</span>
          </div>
          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full animate-pulse" style={{ width: '65%' }} />
          </div>
        </div>

        <p className="text-gray-700 text-xs mt-8">
          Acil durumlar icin destek ekibimizle iletisime gecebilirsiniz.
        </p>
      </div>
    </div>
  );
}
