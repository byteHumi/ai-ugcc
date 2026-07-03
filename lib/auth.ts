import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

// TEMPORARY: shared password login while Google sign-in is disabled.
// Remove this (and the Credentials provider below) when Google auth is restored.
const TEMP_ACCESS_PASSWORD = "runfast1@today";

// Always-allowed emails, regardless of the ALLOWED_EMAILS env var.
const hardcodedAllowedEmails = [
  "ujjwalkrai@gmail.com",
  "suryansh@runable.com",
  "humi@runable.com",
  "umesh@runable.com",
];

const envAllowedEmails = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const allowedEmails = [...hardcodedAllowedEmails, ...envAllowedEmails];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      id: "temp-password",
      name: "Access password",
      credentials: { password: { label: "Password", type: "password" } },
      authorize(credentials) {
        if (credentials?.password === TEMP_ACCESS_PASSWORD) {
          return { id: "temp-user", name: "Team", email: "team@runable.com" };
        }
        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    signIn({ user, account }) {
      // Temp password login bypasses the email allowlist entirely.
      if (account?.provider === "temp-password") return true;
      if (envAllowedEmails.length === 0) return true; // no env allowlist = allow all
      const email = user.email?.toLowerCase();
      if (email && allowedEmails.includes(email)) return true;
      return `/access-denied?email=${encodeURIComponent(user.email ?? "")}`;
    },
    // NextAuth v5 beta drops `picture`/`name` from the JWT after the first
    // sign-in unless we persist them explicitly. Pull them from the Google
    // profile the first time, then keep them around on the token forever.
    async jwt({ token, user, profile }) {
      if (profile && typeof profile === "object") {
        const p = profile as { picture?: string; name?: string; email?: string };
        if (p.picture) token.picture = p.picture;
        if (p.name) token.name = p.name;
        if (p.email) token.email = p.email;
      }
      if (user) {
        if (user.image) token.picture = user.image;
        if (user.name) token.name = user.name;
        if (user.email) token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.image = (token.picture as string | undefined) ?? session.user.image ?? null;
        session.user.name = (token.name as string | undefined) ?? session.user.name ?? null;
        session.user.email = (token.email as string | undefined) ?? session.user.email ?? "";
      }
      return session;
    },
  },
});
