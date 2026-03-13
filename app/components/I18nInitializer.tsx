'use client';

import { useEffect, useState } from 'react';
import '../i18n/config';

export default function I18nInitializer({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Prevent flash of untranslated content on server
  if (!isClient) {
    return null;
  }

  return <>{children}</>;
}

