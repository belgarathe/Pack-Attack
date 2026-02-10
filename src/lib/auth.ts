import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import TwitchProvider from 'next-auth/providers/twitch';
import { PrismaAdapter } from '@auth/prisma-adapter';
import type { Adapter } from 'next-auth/adapters';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma, withRetry } from './prisma';

export const authOptions: NextAuthOptions = {
  // Ensure secret is set
  secret: process.env.NEXTAUTH_SECRET,

  // Use PrismaAdapter for OAuth providers (Twitch)
  // CredentialsProvider bypasses the adapter, so existing email/password flow is unaffected
  adapter: PrismaAdapter(prisma) as Adapter,
  
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

        // OAuth users don't have passwords
        if (!user.passwordHash) {
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
          image: user.image,
          twitchUsername: user.twitchUsername,
        };
      },
    }),

    // Twitch OAuth provider (for chat)
    ...(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET
      ? [
          TwitchProvider({
            clientId: process.env.TWITCH_CLIENT_ID,
            clientSecret: process.env.TWITCH_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  
  // SECURITY: Session configuration with expiration
  // Must use JWT strategy since CredentialsProvider doesn't support database sessions
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
    async jwt({ token, user, trigger, account, profile }) {
      if (user) {
        // SECURITY: Session fixation protection - regenerate token on login
        token.id = user.id;
        token.role = (user as any).role || 'USER';
        token.iat = Math.floor(Date.now() / 1000);
        token.jti = crypto.randomUUID();
        token.image = (user as any).image || null;
        token.twitchUsername = (user as any).twitchUsername || null;
      }

      // On Twitch OAuth login, store the Twitch username
      if (account?.provider === 'twitch' && profile) {
        const twitchProfile = profile as any;
        const twitchUsername = twitchProfile.preferred_username || twitchProfile.login || twitchProfile.display_name || null;
        const twitchImage = twitchProfile.picture || twitchProfile.profile_image_url || null;
        
        token.twitchUsername = twitchUsername;
        token.image = twitchImage;
        token.role = 'USER';

        // Update user record with Twitch info
        if (token.id) {
          try {
            await prisma.user.update({
              where: { id: token.id as string },
              data: {
                twitchUsername: twitchUsername,
                image: twitchImage,
              },
            });
          } catch (error) {
            console.error('[Auth] Failed to update Twitch user info:', error);
          }
        }
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
        session.user.image = token.image as string | null;
        session.user.twitchUsername = token.twitchUsername as string | null;
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
