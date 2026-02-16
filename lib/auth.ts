import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const allowedEmails = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    signIn({ user }) {
      if (allowedEmails.length === 0) return true; // no allowlist = allow all
      const email = user.email?.toLowerCase();
      if (email && allowedEmails.includes(email)) return true;
      return `/access-denied?email=${encodeURIComponent(user.email ?? "")}`;
    },
  },
});
