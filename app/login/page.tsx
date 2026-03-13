'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Eye, EyeOff, Globe, Loader2, Lock, User2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  buildAuthSession,
  extractRoleFromPayload,
  getAccessTokenFromPayload,
  getAuthSession,
  getRefreshTokenFromPayload,
  setAuthSession,
} from '@/app/lib/auth';
import { useLanguage } from '@/app/hooks/useLanguage';
import { useAuthStore } from '@/store/authStore';

type LoginResponse = Record<string, unknown>;

const parseApiError = (payload: unknown, fallback: string): string => {
  if (!payload || typeof payload !== 'object') return fallback;
  const record = payload as Record<string, unknown>;

  if (typeof record.detail === 'string') return record.detail;
  if (typeof record.message === 'string') return record.message;
  if (Array.isArray(record.non_field_errors) && typeof record.non_field_errors[0] === 'string') {
    return record.non_field_errors[0];
  }

  const firstField = Object.values(record).find(
    (value) => Array.isArray(value) && typeof value[0] === 'string'
  );
  if (Array.isArray(firstField) && typeof firstField[0] === 'string') return firstField[0];

  return fallback;
};

export default function LoginPage() {
  const router = useRouter();
  const { language, setLanguage, supportedLanguages, t } = useLanguage();
  const syncFromLoginPayload = useAuthStore((state) => state.syncFromLoginPayload);
  const clearAuthData = useAuthStore((state) => state.clearAuthData);
  const hydrateFromSession = useAuthStore((state) => state.hydrateFromSession);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const session = getAuthSession();
    if (session) {
      hydrateFromSession();
      router.replace('/dashboard');
      return;
    }
    clearAuthData();
    document.cookie = 'access_token=; Max-Age=0; path=/';
    setIsCheckingSession(false);
  }, [router, clearAuthData, hydrateFromSession]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!identifier.trim() || !password) {
      setError(t('pages.login.validationMissingCredentials'));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });

      const data = (await response.json().catch(() => ({}))) as LoginResponse;

      if (!response.ok) {
        setError(parseApiError(data, t('pages.login.errorLoginFailed')));
        return;
      }

      let session = buildAuthSession(data);

      if (!session) {
        const role = extractRoleFromPayload(data);
        const accessToken = getAccessTokenFromPayload(data) || '';

        if (!accessToken || !role) {
          setError(t('pages.login.errorInvalidTokenRole'));
          return;
        }

        session = {
          accessToken,
          refreshToken: getRefreshTokenFromPayload(data),
          role,
          user:
            typeof data.user === 'object' && data.user !== null
              ? {
                  id:
                    typeof (data.user as Record<string, unknown>).id === 'number' ||
                    typeof (data.user as Record<string, unknown>).id === 'string'
                      ? ((data.user as Record<string, unknown>).id as string | number)
                      : undefined,
                  username:
                    typeof (data.user as Record<string, unknown>).username === 'string'
                      ? ((data.user as Record<string, unknown>).username as string)
                      : undefined,
                  email:
                    typeof (data.user as Record<string, unknown>).email === 'string'
                      ? ((data.user as Record<string, unknown>).email as string)
                      : undefined,
                }
              : undefined,
        };
      }

      setAuthSession(session);
      syncFromLoginPayload(data, session);
      router.replace('/dashboard');
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : t('pages.login.errorUnableConnect');
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingSession) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-200 via-neutral-100 to-neutral-300">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-900" />
      </main>
    );
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-neutral-100 text-neutral-900">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      >
        <source src="/login-background.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(0,0,0,0.35),transparent_35%),radial-gradient(circle_at_85%_85%,rgba(0,0,0,0.30),transparent_40%)]" />

      <section className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-5xl grid lg:grid-cols-[1.05fr_0.95fr] rounded-3xl overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.25)] border border-neutral-300 bg-white/85 backdrop-blur-md"
        >
          <motion.aside 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-neutral-900 to-neutral-700 text-neutral-100"
          >
            <div>
              <motion.img 
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.5, delay: 0.3, type: "spring", stiffness: 200 }}
                src="/kingkunta-logo.svg" 
                alt="Kingkunta icon" 
                className="w-14 h-14 mb-6" 
              />
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="text-4xl leading-tight font-semibold tracking-tight"
              >
                Kingkunta 
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="mt-4 text-neutral-300 text-sm leading-relaxed max-w-sm"
              >
                {t('pages.login.secureSignIn')}
              </motion.p>
            </div>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="text-sm text-neutral-300/90"
            >
              {t('pages.login.brandTagline')}
            </motion.p>
          </motion.aside>

          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="p-6 sm:p-10 lg:p-12"
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="lg:hidden flex items-center gap-3">
                <img src="/kingkunta-logo.svg" alt="Kingkunta icon" className="w-10 h-10" />
                <div>
                  <p className="font-semibold text-lg leading-none">Kingkunta</p>
                  <p className="text-xs text-neutral-500 mt-1">{t('pages.login.brandTagline')}</p>
                </div>
              </div>

              <div className="ml-auto w-full max-w-[220px]">
                <label className="text-xs font-medium text-neutral-600 block mb-1.5">{t('language.select')}</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full h-11 pl-10 pr-3 rounded-xl border border-neutral-300 bg-white text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-700"
                  >
                    {supportedLanguages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.nativeName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900"
            >
              {t('pages.login.welcomeBack')}
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-2 text-sm text-neutral-600"
            >
              {t('pages.login.subtitle')}
            </motion.p>

            <motion.form 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              onSubmit={onSubmit} 
              className="mt-8 space-y-4"
            >
              <motion.label 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.8 }}
                className="block"
              >
                <span className="text-sm font-medium text-neutral-700">{t('pages.login.identifierLabel')}</span>
                <div className="mt-1.5 relative">
                  <User2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete="username"
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-700"
                    placeholder={t('pages.login.identifierPlaceholder')}
                  />
                </div>
              </motion.label>

              <motion.label 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.9 }}
                className="block"
              >
                <span className="text-sm font-medium text-neutral-700">{t('pages.login.passwordLabel')}</span>
                <div className="mt-1.5 relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full h-12 pl-10 pr-12 rounded-xl border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-700"
                    placeholder={t('pages.login.passwordPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-900"
                    aria-label={showPassword ? t('pages.login.hidePassword') : t('pages.login.showPassword')}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </motion.label>

              <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  <AlertTriangle className="w-4 h-4 mt-0.5" />
                  <p>{error}</p>
                </motion.div>
              )}
              </AnimatePresence>

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 1.0 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 inline-flex items-center justify-center rounded-xl bg-neutral-900 text-white font-medium hover:bg-neutral-800 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('pages.login.signingIn')}
                  </>
                ) : (
                  t('pages.login.signIn')
                )}
              </motion.button>
            </motion.form>
          </motion.div>
        </motion.div>
      </section>
    </main>
  );
}
