'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getAuthSession } from '@/app/lib/auth';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const session = getAuthSession();
    router.replace(session ? '/dashboard' : '/login');
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-200 via-neutral-100 to-neutral-300">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-8 h-8 rounded-full border-2 border-neutral-400 border-t-neutral-900 animate-spin" 
      />
    </main>
  );
}
