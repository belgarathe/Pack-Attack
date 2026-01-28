import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma, withRetry } from './prisma';

export const authOptions: NextAuthOptions = {
  // Ensure secret is set
  secret: process.env.NEXTAUTH_SECRET,
  
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Use withRetry for database resilience during authentication
        const user = await withRetry(
          () => prisma.user.findUnique({
            where: { email: credentials.email },
          }),
          'auth:findUser'
        );

        if (!user) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        // SECURITY: Enforce email verification before login
        if (!user.emailVerified) {
          // Log for monitoring but don't reveal to user why login failed
          console.warn(`[Auth] Login attempt with unverified email: ${user.email}`);
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  
  // SECURITY: Session configuration with expiration
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days absolute maximum
    updateAge: 24 * 60 * 60,   // Refresh token every 24 hours
  },
  
  // SECURITY: JWT configuration with expiration
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  // SECURITY: Cookie settings for production
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token' 
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        // SECURITY: Session fixation protection - regenerate token on login
        token.id = user.id;
        token.role = user.role;
        token.iat = Math.floor(Date.now() / 1000);
        token.jti = crypto.randomUUID(); // Unique token ID for each session
      }
      
      // Refresh timestamp on token update
      if (trigger === 'update') {
        token.iat = Math.floor(Date.now() / 1000);
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};

export async function getCurrentSession() {
  const { getServerSession } = await import('next-auth/next');
  return getServerSession(authOptions);
}

