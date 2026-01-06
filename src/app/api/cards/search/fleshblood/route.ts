import { NextResponse } from 'next/server';
import { searchJustTCG, isJustTCGConfigured } from '@/lib/justtcg';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
  }

  // Try JustTCG first (requires API key)
  if (isJustTCGConfigured()) {
    const result = await searchJustTCG('fleshblood', query, 20);
    if (result.success) {
      return NextResponse.json(result);
    }
  }

  // Try FABDB API as fallback
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    // FABDB has a card search endpoint
    const apiUrl = `https://api.fabdb.net/cards?per_page=50&keywords=${encodeURIComponent(query)}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Pack-Attack/1.0',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const cards = data.data || [];

      if (cards.length === 0) {
        return NextResponse.json({
          success: true,
          cards: [],
          message: 'No cards found matching your search',
        });
      }

      return NextResponse.json({
        success: true,
        cards: cards.slice(0, 50).map((card: any) => {
          return {
            id: `fab-${card.identifier || card.id}`,
            name: card.name || 'Unknown Card',
            setName: card.printings?.[0]?.set?.name || card.set_name || '',
            setCode: card.printings?.[0]?.set?.id || card.set_code || '',
            collectorNumber: card.printings?.[0]?.id || String(card.id || ''),
            rarity: card.rarity?.toLowerCase() || 'common',
            imageUrl: card.printings?.[0]?.image || card.image || '',
            colors: card.class ? [card.class] : [],
            type: card.type || '',
            price: null,
          };
        }),
      });
    }
  } catch (error) {
    console.warn('FABDB API error:', error);
  }

  // No API available
  return NextResponse.json({
    success: false,
    error: 'Flesh and Blood card search unavailable',
    message: 'Flesh and Blood card search requires JUSTTCG_API_KEY to be configured. Please contact the administrator.',
  }, { status: 503 });
}













