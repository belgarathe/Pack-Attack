import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
  }

  try {
    // According to optcgapi.com documentation: /api/allSetCards/ (plural, with trailing slash)
    // Also try /api/sets/filtered/ for better search results
    let allCardsResponse;
    let useFiltered = false;

    // First try the filtered endpoint if it supports name search
    try {
      const filteredResponse = await fetch(
        `https://optcgapi.com/api/sets/filtered/?name=${encodeURIComponent(query)}`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Pack-Attack/1.0',
          },
          cache: 'no-store',
        }
      );

      if (filteredResponse.ok) {
        const contentType = filteredResponse.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const filteredData = await filteredResponse.json();
          if (Array.isArray(filteredData) && filteredData.length > 0) {
            return processCards(filteredData, query);
          }
        }
      }
    } catch (filteredError) {
      // Fall back to allSetCards
      console.log('Filtered endpoint failed, using allSetCards');
    }

    // Use /api/allSetCards/ (correct endpoint from documentation)
    allCardsResponse = await fetch(
      'https://optcgapi.com/api/allSetCards/',
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Pack-Attack/1.0',
        },
        cache: 'no-store',
      }
    );

    // Check if response is valid JSON
    const contentType = allCardsResponse.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await allCardsResponse.text();
      if (text.includes('<!doctype') || text.includes('<html') || text.includes('Not Found')) {
        return NextResponse.json({ 
          error: 'One Piece API endpoint not available',
          suggestion: 'The API endpoint may have changed. Please check optcgapi.com documentation.'
        }, { status: 503 });
      }
    }

    if (!allCardsResponse.ok) {
      return NextResponse.json({ 
        error: `One Piece API returned status ${allCardsResponse.status}` 
      }, { status: allCardsResponse.status });
    }

    const allCards = await allCardsResponse.json();
    return processCards(allCards, query);
  } catch (error) {
    console.error('One Piece API error:', error);
    return NextResponse.json({ 
      error: 'Failed to search cards',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function processCards(allCards: any, query: string) {
  const searchTerm = query.toLowerCase();
  
  // Filter cards by name (case-insensitive)
  const filteredCards = Array.isArray(allCards) 
    ? allCards.filter((card: any) => {
        const cardName = (card.name || card.card_name || card.title || '').toLowerCase();
        const setName = (card.set_name || card.set || card.set_id || '').toLowerCase();
        return cardName.includes(searchTerm) || setName.includes(searchTerm);
      })
    : [];

  if (filteredCards.length === 0) {
    return NextResponse.json({
      success: true,
      cards: [],
      message: 'No cards found matching your search',
    });
  }

  return NextResponse.json({
    success: true,
    cards: filteredCards.slice(0, 50).map((card: any) => {
      // Map various possible field names to our standard format
      // Try multiple image URL fields based on API response structure
      const imageUrl = card.image || 
                      card.image_url || 
                      card.card_image || 
                      card.images?.small || 
                      card.images?.large ||
                      card.images?.normal ||
                      card.images?.png ||
                      card.image_urls?.small ||
                      card.image_urls?.large ||
                      '';
      
      return {
        id: card.id || 
            card.card_id || 
            `${card.set_id || ''}_${card.card_number || card.number || card.id || ''}`.replace(/^_/, ''),
        name: card.name || card.card_name || card.title || 'Unknown Card',
        setName: card.set_name || card.set || card.set_id || '',
        setCode: card.set_code || card.set_id || card.set || '',
        collectorNumber: String(card.card_number || card.number || card.collector_number || ''),
        rarity: card.rarity || card.card_rarity || card.rarity_name || 'common',
        imageUrl: imageUrl,
        colors: card.color 
          ? (Array.isArray(card.color) ? card.color : [card.color])
          : (card.colors ? (Array.isArray(card.colors) ? card.colors : [card.colors]) : []),
        type: card.type || card.card_type || card.types?.[0] || '',
        price: card.price || card.price_data?.average || null,
      };
    }),
  });
}
