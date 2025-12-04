import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
  }

  try {
    // According to lorcana-api.com documentation:
    // - API URL is api.lorcana-api.com
    // - Available endpoints: /cards/all, /cards/fetch
    // - /cards/all returns all cards, we filter client-side
    const response = await fetch(
      'https://api.lorcana-api.com/cards/all',
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Pack-Attack/1.0',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      return NextResponse.json({ 
        error: `Lorcana API returned status ${response.status}`,
        details: 'Failed to fetch cards from api.lorcana-api.com'
      }, { status: response.status });
    }

    const allCards = await response.json();
    
    // Filter cards by name (case-insensitive)
    const searchTerm = query.toLowerCase();
    const filteredCards = Array.isArray(allCards)
      ? allCards.filter((card: any) => {
          const cardName = (card.Name || card.name || '').toLowerCase();
          return cardName.includes(searchTerm);
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
        // Map Lorcana API response fields to our standard format
        // API uses fields like: Name, Image, Set_Name, Rarity, etc.
        return {
          id: card.id || `${card.Set_Num || ''}_${card.Name || ''}`.replace(/\s+/g, '_'),
          name: card.Name || card.name || 'Unknown Card',
          setName: card.Set_Name || card.set_name || card.SetName || '',
          setCode: card.Set_Num ? `SET${card.Set_Num}` : card.set_code || '',
          collectorNumber: String(card.Set_Num || card.number || card.collector_number || ''),
          rarity: card.Rarity || card.rarity || card.rarity_name || 'common',
          imageUrl: card.Image || 
                    card.image || 
                    card.image_url || 
                    card.images?.small || 
                    card.images?.large ||
                    '',
          colors: card.Color 
            ? (Array.isArray(card.Color) ? card.Color : card.Color.split(',').map((c: string) => c.trim()))
            : (card.color ? (Array.isArray(card.color) ? card.color : [card.color]) : []),
          type: card.Type || card.type || card.card_type || '',
          cost: card.Cost || card.cost || null,
          price: card.price || null,
        };
      }),
    });
  } catch (error) {
    console.error('Lorcana API error:', error);
    return NextResponse.json({ 
      error: 'Failed to search cards',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
