import { NextResponse } from 'next/server';
import { searchJustTCG, isJustTCGConfigured } from '@/lib/justtcg';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
  }

  if (!isJustTCGConfigured()) {
    return NextResponse.json({
      success: false,
      error: 'Flesh and Blood card search is not configured',
      message: 'Please contact the administrator to configure the card search API.',
    }, { status: 503 });
  }

  const result = await searchJustTCG('fleshblood', query, 20);
  
  if (!result.success) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result);
}

