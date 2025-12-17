import { NextResponse } from 'next/server';

// JustTCG API configuration
const JUSTTCG_API_KEY = 'REMOVED_USE_ENV_VAR';
const JUSTTCG_API_URL = 'https://api.justtcg.com/v1/cards';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    // Use JustTCG API for One Piece cards
    const response = await fetch(
      `${JUSTTCG_API_URL}?game=one-piece-card-game&q=${encodeURIComponent(query)}&limit=200`,
      {
        headers: {
          'X-API-Key': JUSTTCG_API_KEY,
          'Accept': 'application/json',
        },
        cache: 'no-store',
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('JustTCG API error:', response.status, errorText);
      return NextResponse.json({
        success: false,
        error: `JustTCG API error: ${response.status}`,
        details: errorText,
      }, { status: response.status });
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return NextResponse.json({
        success: true,
        cards: [],
        message: 'No cards found matching your search',
      });
    }

    // Map JustTCG response to our card format
    const cards = data.data.map((card: any) => {
      // Get the TCGPlayer ID for image URL
      const tcgplayerId = card.tcgplayerId;
      
      // Construct image URL from TCGPlayer CDN
      const imageUrl = tcgplayerId 
        ? `https://product-images.tcgplayer.com/fit-in/400x558/${tcgplayerId}.jpg`
        : '';

      // Extract price from first variant if available
      const price = card.variants?.[0]?.price || null;

      return {
        id: card.id,
        name: card.name || 'Unknown Card',
        setName: card.set_name || '',
        setCode: card.set || '',
        collectorNumber: card.number || '',
        rarity: card.rarity || 'common',
        imageUrl: imageUrl,
        tcgplayerId: tcgplayerId,
        price: price,
        type: 'One Piece',
      };
    });

    return NextResponse.json({
      success: true,
      cards: cards,
      total: cards.length,
    });

  } catch (error) {
    console.error('One Piece API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check if it's a timeout/abort error
    if (errorMessage.includes('abort')) {
      return NextResponse.json({
        success: false,
        error: 'Request timeout',
        message: 'The card search took too long. Please try a more specific search term.',
      }, { status: 504 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to search cards',
      details: errorMessage,
    }, { status: 500 });
  }
}
