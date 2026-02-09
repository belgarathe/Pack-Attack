import { NextResponse } from 'next/server';
import { searchJustTCG, isJustTCGConfigured } from '@/lib/justtcg';

// Cache for Lorcana cards (in-memory, refreshed on server restart)
let cachedCards: any[] | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

async function fetchAllLorcanaCards(): Promise<any[]> {
  // Return cached data if valid
  if (cachedCards && Date.now() - cacheTime < CACHE_DURATION) {
    return cachedCards;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(
      'https://api.lorcana-api.com/cards/all',
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Pack-Attack/1.0',
        },
        cache: 'no-store',
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const cards = Array.isArray(data) ? data : [];

      if (cards.length > 0) {
        console.log(`Loaded ${cards.length} Lorcana cards from Lorcana API`);
        cachedCards = cards;
        cacheTime = Date.now();
        return cards;
      }
    }
  } catch (error) {
    console.warn('Failed to fetch from Lorcana API:', error);
  }

  return [];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const source = searchParams.get('source') || 'lorcana-api'; // 'lorcana-api' or 'justtcg'

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
  }

  // Use JustTCG API if requested
  if (source === 'justtcg') {
    if (!isJustTCGConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'JustTCG API not configured',
        message: 'Please set JUSTTCG_API_KEY environment variable',
      }, { status: 503 });
    }
    
    const result = await searchJustTCG('lorcana', query, 20);
    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json(result);
  }

  // Default: Use Lorcana API with caching
  try {
    const allCards = await fetchAllLorcanaCards();

    if (allCards.length === 0) {
      // Fallback to JustTCG if Lorcana API is down
      if (isJustTCGConfigured()) {
        const result = await searchJustTCG('lorcana', query, 20);
        if (result.success) {
          return NextResponse.json(result);
        }
      }

      return NextResponse.json({ 
        success: false,
        error: 'Lorcana card search unavailable',
        message: 'Could not connect to Lorcana card APIs. Please try again later.',
      }, { status: 503 });
    }

    const searchTerm = query.toLowerCase();
    const filteredCards = allCards.filter((card: any) => {
      const cardName = (card.Name || card.name || '').toLowerCase();
      const setName = (card.Set_Name || card.set_name || '').toLowerCase();
      return cardName.includes(searchTerm) || setName.includes(searchTerm);
    });

    if (filteredCards.length === 0) {
      return NextResponse.json({
        success: true,
        cards: [],
        message: 'No cards found matching your search',
      });
    }

    return NextResponse.json({
      success: true,
      cards: filteredCards.slice(0, 200).map((card: any) => ({
        id: card.id || `${card.Set_Num || ''}_${card.Name || ''}`.replace(/\s+/g, '_'),
        name: card.Name || card.name || 'Unknown Card',
        setName: card.Set_Name || card.set_name || card.SetName || '',
        setCode: card.Set_Num ? `SET${card.Set_Num}` : card.set_code || '',
        collectorNumber: String(card.Set_Num || card.number || card.collector_number || ''),
        rarity: card.Rarity || card.rarity || card.rarity_name || 'common',
        imageUrl: card.Image || card.image || card.image_url || card.images?.small || card.images?.large || '',
        colors: card.Color 
          ? (Array.isArray(card.Color) ? card.Color : card.Color.split(',').map((c: string) => c.trim()))
          : (card.color ? (Array.isArray(card.color) ? card.color : [card.color]) : []),
        type: card.Type || card.type || card.card_type || '',
        cost: card.Cost || card.cost || null,
        price: card.price || null,
      })),
    });
  } catch (error) {
    console.error('Lorcana API error:', error);
    
    // Fallback to JustTCG
    if (isJustTCGConfigured()) {
      const result = await searchJustTCG('lorcana', query, 20);
      if (result.success) {
        return NextResponse.json(result);
      }
    }

    return NextResponse.json({ 
      success: false,
      error: 'Failed to search cards',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
