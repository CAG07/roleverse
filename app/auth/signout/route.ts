import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const origin = request.nextUrl.origin;
  return NextResponse.redirect(new URL('/', origin));
}
