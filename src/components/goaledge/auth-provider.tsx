"use client";

/**
 * Thin wrapper kept so `src/app/layout.tsx` (and anything else importing the
 * old NextAuth `SessionProvider` wrapper) keeps working. The real
 * implementation — context, `useSession()`, `useAuth()` — lives in
 * `src/lib/session-context.tsx`.
 */

import { SessionProvider } from "@/lib/session-context";
import type { ReactNode } from "react";

export default function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
