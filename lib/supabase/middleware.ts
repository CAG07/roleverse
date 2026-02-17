// lib/supabase/middleware.ts
// Refreshes auth tokens and protects routes under /(app)/

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  // Skip middleware entirely for health check
  if (request.nextUrl.pathname === '/api/health') {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh auth session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public routes that don't require auth
  const isPublicRoute =
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname === '/unauthorized' ||
    request.nextUrl.pathname.startsWith('/auth');

  // Protect authenticated routes under /(app)/
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Email allowlist check
  if (user) {
    const allowedEmailsEnv = process.env.ALLOWED_EMAILS;
    if (allowedEmailsEnv && allowedEmailsEnv.trim() !== '') {
      const allowedEmails = allowedEmailsEnv
        .split(',')
        .map((e) => e.trim().toLowerCase());
      const userEmail = (user.email ?? '').toLowerCase();
      if (!allowedEmails.includes(userEmail)) {
        if (!isPublicRoute) {
          const url = request.nextUrl.clone();
          url.pathname = '/unauthorized';
          return NextResponse.redirect(url);
        }
        return supabaseResponse;
      }
    }
  }

  // Redirect to dashboard if already logged in and trying to access landing
  if (user && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
