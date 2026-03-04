import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const serverActionAbuse = new Map<string, { count: number; resetAt: number }>();

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Block fake Server Action probes — these are attack requests with
  // bogus action IDs that spam the error log
  const nextAction = request.headers.get('next-action');
  if (nextAction) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const now = Date.now();
    const entry = serverActionAbuse.get(ip);

    if (entry && now < entry.resetAt) {
      entry.count++;
      if (entry.count > 30) {
        return new NextResponse('Too Many Requests', { status: 429 });
      }
    } else {
      serverActionAbuse.set(ip, { count: 1, resetAt: now + 60_000 });
    }

    // Prune stale entries periodically
    if (serverActionAbuse.size > 500) {
      for (const [key, val] of serverActionAbuse) {
        if (now > val.resetAt) serverActionAbuse.delete(key);
      }
    }
  }

  // Protect all admin routes
  if (pathname.startsWith('/admin')) {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (token.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Protect shop-dashboard routes
  if (pathname.startsWith('/shop-dashboard')) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/shop-dashboard/:path*',
    '/((?!_next/static|_next/image|favicon.ico|api/health).*)',
  ],
};
