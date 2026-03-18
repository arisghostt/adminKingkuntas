'use client';

import { ShieldOff, Lock } from 'lucide-react';

interface PermissionRestrictedProps {
  /** Custom message to override the default */
  message?: string;
  /** Secondary hint text */
  hint?: string;
  /** Visual variant */
  variant?: 'card' | 'inline' | 'full';
  /** Extra class names to apply on the wrapper */
  className?: string;
}

/**
 * Displayed whenever a user's role lacks the permission required to view
 * a specific section (table, chart, card, …).
 */
export default function PermissionRestricted({
  message = 'Accès restreint',
  hint = "Votre rôle actuel ne dispose pas des permissions nécessaires pour consulter cette section. Contactez un administrateur.",
  variant = 'card',
  className = '',
}: PermissionRestrictedProps) {
  if (variant === 'inline') {
    return (
      <div
        className={`flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 ${className}`}
      >
        <Lock className="w-4 h-4 shrink-0 text-amber-500" />
        <span>{message}</span>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div
        className={`flex flex-col items-center justify-center min-h-[320px] text-center ${className}`}
      >
        <div className="p-5 rounded-full bg-amber-50 border border-amber-100 mb-4">
          <ShieldOff className="w-10 h-10 text-amber-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{message}</h3>
        <p className="text-sm text-gray-500 max-w-sm">{hint}</p>
      </div>
    );
  }

  /* Default: card */
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-6 text-center bg-amber-50 border border-amber-100 rounded-xl ${className}`}
    >
      <div className="p-4 rounded-full bg-white border border-amber-200 shadow-sm mb-4">
        <ShieldOff className="w-8 h-8 text-amber-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-800 mb-1">{message}</h3>
      <p className="text-sm text-gray-500 max-w-xs">{hint}</p>
    </div>
  );
}
