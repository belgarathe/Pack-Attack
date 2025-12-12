import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
  }

  try {
    // According to pokemontcg.io documentation:
    // - API URL: https://api.pokemontcg.io/v2/cards
    // - Query format: q=name:gardevoir (uses name: prefix)
    // - Supports partial matches with * wildcard
    // - Response format: { data: [...], total: number, page: number, pageSize: number }
    
    // Use * wildcard for partial name matching
    // Request up to 200 cards per page
    const searchQuery = query.includes('*') ? query : `*${query}*`;
    const apiUrl = `https://api.pokemontcg.io/v2/cards?q=name:${encodeURIComponent(searchQuery)}&pageSize=200`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Pack-Attack/1.0',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pokemon API error:', response.status, errorText);
      return NextResponse.json({ 
        error: `Pokémon TCG API error (${response.status})`,
        details: errorText.substring(0, 200)
      }, { status: response.status });
    }

    const data = await response.json();
    
    // Handle response structure: { data: [...], total: number, ... }
    const cards = Array.isArray(data.data) ? data.data : [];
    
    if (cards.length === 0) {
      return NextResponse.json({
        success: true,
        cards: [],
        message: 'No cards found matching your search',
      });
    }

    return NextResponse.json({
      success: true,
      cards: cards.map((card: any) => {
        // Map Pokemon TCG API response to our standard format
        return {
          id: card.id || '',
          name: card.name || 'Unknown Card',
          setName: card.set?.name || card.setName || '',
          setCode: card.set?.id || card.set?.ptcgoCode || card.setCode || '',
          collectorNumber: String(card.number || card.collectorNumber || ''),
          rarity: card.rarity || 'common',
          imageUrl: card.images?.large || 
                    card.images?.small || 
                    card.imageUrl || 
                    '',
          imageUrlSmall: card.images?.small,
          imageUrlLarge: card.images?.large,
          colors: card.types || card.colors || [],
          type: card.supertype || card.type || '',
          subtypes: card.subtypes || [],
          hp: card.hp || null,
          price: card.tcgplayer?.prices?.normal?.market || 
                 card.tcgplayer?.prices?.holofoil?.market || 
                 card.tcgplayer?.prices?.reverseHolofoil?.market ||
                 null,
        };
      }),
    });
  } catch (error) {
    console.error('Pokémon TCG API error:', error);
    return NextResponse.json({ 
      error: 'Failed to search cards',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
