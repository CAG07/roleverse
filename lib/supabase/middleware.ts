import { NextResponse } from 'next/server';

export async function updateSession(req) {
    const { pathname } = req.nextUrl;

    // Skip authentication for the /api/health endpoint
    if (pathname === '/api/health') {
        return NextResponse.next();
    }

    // Your existing Supabase client creation and authentication logic here...
}
