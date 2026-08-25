import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { UserRole } from '@lenta/shared';
import { Lock, Mail, User, ShieldCheck, UserCheck, Eye, ArrowRight, Sparkles } from 'lucide-react';
import { Modal } from './Modal';
import { LemonLogo } from './LemonLogo';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    authModalTab,
    closeAuthModal,
    login,
    register,
    switchDemoRole,
    role: currentRole,
  } = useAuth();
  const { t } = useI18n();

  const [tab, setTab] = useState<'login' | 'register'>(authModalTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync tab when modal opens
  React.useEffect(() => {
    setTab(authModalTab);
  }, [authModalTab, isAuthModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSelect = (role: UserRole) => {
    switchDemoRole(role);
  };

  return (
    <Modal
      isOpen={isAuthModalOpen}
      onClose={closeAuthModal}
      maxWidth="max-w-lg"
      title={tab === 'login' ? t.loginModalTitle : t.registerModalTitle}
      subtitle="Lemon Calendarium Access Tier"
      icon={<LemonLogo size={32} />}
    >
      {/* Tab Selector */}
      <div className="flex border-b border-[#242828] bg-[#141616]">
        <button
          onClick={() => setTab('login')}
          className={`flex-1 py-2.5 text-xs font-mono font-semibold transition-colors flex items-center justify-center gap-2 ${
            tab === 'login'
              ? 'text-[#e5e971] border-b-2 border-[#c9cd58] bg-[#1e2020]'
              : 'text-[#93927e] hover:text-[#e2e2e2]'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>{t.login}</span>
        </button>
        <button
          onClick={() => setTab('register')}
          className={`flex-1 py-2.5 text-xs font-mono font-semibold transition-colors flex items-center justify-center gap-2 ${
            tab === 'register'
              ? 'text-[#e5e971] border-b-2 border-[#c9cd58] bg-[#1e2020]'
              : 'text-[#93927e] hover:text-[#e2e2e2]'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>{t.register}</span>
        </button>
      </div>

      {/* Modal Body */}
      <div className="p-6 flex flex-col gap-5 max-h-[80vh] overflow-y-auto">
        {/* One-Click Quick Demo Sign In Cards */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-mono font-semibold text-[#c9c7b2] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#c9cd58]" />
            {t.signInWithDemoRole}
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Guest Card */}
            <button
              type="button"
              onClick={() => handleDemoSelect('guest')}
              className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                currentRole === 'guest'
                  ? 'bg-[#c9cd58]/10 border-[#c9cd58] text-[#e5e971]'
                  : 'bg-[#121414] border-[#242828] text-[#c9c7b2] hover:border-[#484837] hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-sans font-bold text-xs">🌐 {t.guestRole}</span>
                <Eye className="w-3.5 h-3.5 text-[#93927e]" />
              </div>
              <p className="text-[10px] text-[#93927e] line-clamp-2 leading-snug">
                {t.demoGuestDesc}
              </p>
            </button>

            {/* Member Card */}
            <button
              type="button"
              onClick={() => handleDemoSelect('user')}
              className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                currentRole === 'user'
                  ? 'bg-[#c9cd58]/20 border-[#c9cd58] text-[#e5e971] shadow-glow-lemon'
                  : 'bg-[#121414] border-[#242828] text-[#c9c7b2] hover:border-[#c9cd58]/50 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-sans font-bold text-xs text-[#c9cd58]">👤 {t.memberRole}</span>
                <UserCheck className="w-3.5 h-3.5 text-[#c9cd58]" />
              </div>
              <p className="text-[10px] text-[#93927e] line-clamp-2 leading-snug">
                {t.demoMemberDesc}
              </p>
            </button>

            {/* Admin Card */}
            <button
              type="button"
              onClick={() => handleDemoSelect('admin')}
              className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                currentRole === 'admin'
                  ? 'bg-[#ef4444]/15 border-[#ef4444] text-[#fca5a5]'
                  : 'bg-[#121414] border-[#242828] text-[#c9c7b2] hover:border-[#ef4444]/50 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-sans font-bold text-xs text-[#ef4444]">⚡ {t.adminRole}</span>
                <ShieldCheck className="w-3.5 h-3.5 text-[#ef4444]" />
              </div>
              <p className="text-[10px] text-[#93927e] line-clamp-2 leading-snug">
                {t.demoAdminDesc}
              </p>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-[1px] bg-[#242828]" />
          <span className="text-[11px] font-mono text-[#93927e]">или через email</span>
          <div className="flex-1 h-[1px] bg-[#242828]" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {tab === 'register' && (
            <div>
              <label className="block text-[11px] font-mono text-[#c9c7b2] mb-1">
                {t.nameLabel}
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#93927e]" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Александр Иванов"
                  className="w-full bg-[#121414] border border-[#242828] focus:border-[#c9cd58] rounded-md text-xs font-mono pl-9 pr-3 py-2 text-[#e2e2e2] placeholder-[#93927e] outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-mono text-[#c9c7b2] mb-1">
              {t.emailLabel}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#93927e]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="member@lemon.team"
                className="w-full bg-[#121414] border border-[#242828] focus:border-[#c9cd58] rounded-md text-xs font-mono pl-9 pr-3 py-2 text-[#e2e2e2] placeholder-[#93927e] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-[#c9c7b2] mb-1">
              {t.passwordLabel}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#93927e]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#121414] border border-[#242828] focus:border-[#c9cd58] rounded-md text-xs font-mono pl-9 pr-3 py-2 text-[#e2e2e2] placeholder-[#93927e] outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-2.5 px-4 rounded-md bg-[#c9cd58] hover:bg-[#dce06b] text-[#121414] font-sans font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-glow-lemon"
          >
            <span>{tab === 'login' ? t.signInAction : t.createAccountAction}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Toggle Tab */}
        <div className="text-center pt-1 border-t border-[#242828]">
          <button
            type="button"
            onClick={() => setTab(tab === 'login' ? 'register' : 'login')}
            className="text-xs font-mono text-[#c9cd58] hover:underline"
          >
            {tab === 'login' ? t.dontHaveAccount : t.alreadyHaveAccount}
          </button>
        </div>
      </div>
    </Modal>
  );
};
