/**
 * @file app/providers.tsx
 * @description Client-side provider wrapper for the Next.js App Router layout.
 * Keeps the root layout a server component while allowing client context.
 */

'use client';

import { AuthProvider } from '@/context/AuthContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
