import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// NextAuth v4 route handler — required for /api/auth/csrf, /api/auth/callback/credentials,
// /api/auth/session, /api/auth/signout etc. (used by AuthModal + UserProfilePanel).
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
