import { NextResponse } from 'next/server';
import { searchJustTCG, isJustTCGConfigured } from '@/lib/justtcg';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const source = searchParams.get('source') || 'ygoprodeck';

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
  }

  // Try JustTCG if configured and requested
  if (source === 'justtcg' && isJustTCGConfigured()) {
    const result = await searchJustTCG('yugioh', query, 20);
    if (result.success && result.cards && result.cards.length > 0) {
      return NextResponse.json(result);
    }
  }

  // Default: Use YGOProDeck API (free, no key required)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    // YGOProDeck API - fname for fuzzy name search
    const apiUrl = `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(query)}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Pack-Attack/1.0',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // YGOProDeck returns 400 when no cards found
      if (response.status === 400) {
        return NextResponse.json({
          success: true,
          cards: [],
          message: 'No cards found matching your search',
        });
      }
      throw new Error(`YGOProDeck API error: ${response.status}`);
    }

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
        // Get the best image available
        const imageUrl = card.card_images?.[0]?.image_url || 
                        card.card_images?.[0]?.image_url_small || '';
        
        return {
          id: `ygo-${card.id}`,
          name: card.name || 'Unknown Card',
          setName: card.archetype || card.card_sets?.[0]?.set_name || '',
          setCode: card.card_sets?.[0]?.set_code || '',
          collectorNumber: card.card_sets?.[0]?.set_rarity_code || String(card.id),
          rarity: card.card_sets?.[0]?.set_rarity || 'common',
          imageUrl: imageUrl,
          colors: card.attribute ? [card.attribute] : [],
          type: card.type || '',
          price: card.card_prices?.[0]?.tcgplayer_price || 
                 card.card_prices?.[0]?.cardmarket_price || null,
        };
      }),
    });
  } catch (error) {
    console.error('YGOProDeck API error:', error);
    
    // Try JustTCG as fallback if configured
    if (isJustTCGConfigured()) {
      const result = await searchJustTCG('yugioh', query, 20);
      if (result.success) {
        return NextResponse.json(result);
      }
    }
    
    return NextResponse.json({
      success: false,
      error: 'Yu-Gi-Oh card search unavailable',
      message: 'Card search APIs are currently unavailable. Please try again later.',
    }, { status: 503 });
  }
}













