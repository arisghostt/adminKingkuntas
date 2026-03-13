'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '../LanguageProvider';

function FooterContent() {
  const [year, setYear] = useState<number | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer 
      className="py-4 text-center text-sm border-t mt-auto"
      style={{ 
        color: 'var(--text-secondary)',
        borderColor: 'var(--border)',
        background: 'var(--topbar-bg)'
      }}
    >
      &copy; {year ?? new Date().getFullYear()} {t('common.appName')} | {t('common.allRightsReserved')}
    </footer>
  );
}

export default function Footer() {
  const { language } = useLanguage();
  
  // Force complete re-mount when language changes to ensure translations update properly
  return <FooterContent key={language} />;
}

