import { NextResponse } from 'next/server';
import { searchJustTCG, isJustTCGConfigured } from '@/lib/justtcg';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const source = searchParams.get('source') || 'pokemontcg'; // 'pokemontcg' or 'justtcg'

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
    
    const result = await searchJustTCG('pokemon', query, 20);
    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json(result);
  }

  // Default: Use Pokemon TCG API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

    const searchQuery = query.includes('*') ? query : `*${query}*`;
    const apiUrl = `https://api.pokemontcg.io/v2/cards?q=name:${encodeURIComponent(searchQuery)}&pageSize=200`;
    
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
      const errorText = await response.text();
      console.error('Pokemon API error:', response.status, errorText);
      
      // Fallback to JustTCG on error
      if (isJustTCGConfigured()) {
        const result = await searchJustTCG('pokemon', query, 20);
        if (result.success) {
          return NextResponse.json(result);
        }
      }

      return NextResponse.json({ 
        error: `Pokémon TCG API error (${response.status})`,
        details: errorText.substring(0, 200)
      }, { status: response.status });
    }

    const data = await response.json();
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
      cards: cards.map((card: any) => ({
        id: card.id || '',
        name: card.name || 'Unknown Card',
        setName: card.set?.name || card.setName || '',
        setCode: card.set?.id || card.set?.ptcgoCode || card.setCode || '',
        collectorNumber: String(card.number || card.collectorNumber || ''),
        rarity: card.rarity || 'common',
        imageUrl: card.images?.large || card.images?.small || card.imageUrl || '',
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
      })),
    });
  } catch (error) {
    console.error('Pokémon TCG API error:', error);
    
    // Fallback to JustTCG on timeout/error
    if (isJustTCGConfigured()) {
      const result = await searchJustTCG('pokemon', query, 20);
      if (result.success) {
        return NextResponse.json(result);
      }
    }

    return NextResponse.json({ 
      error: 'Failed to search cards',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
