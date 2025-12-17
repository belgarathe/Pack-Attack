import { NextResponse } from 'next/server';
import { searchJustTCG, isJustTCGConfigured } from '@/lib/justtcg';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const source = searchParams.get('source') || 'justtcg'; // Default to JustTCG since optcgapi is down

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
  }

  // Use JustTCG API (default and recommended)
  if (source === 'justtcg') {
    if (!isJustTCGConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'One Piece card search is not configured',
        message: 'Please contact the administrator to configure the card search API.',
      }, { status: 503 });
    }

    const result = await searchJustTCG('onepiece', query, 20);
    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json(result);
  }

  // Legacy: Try OPTCG API (often down)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      'https://optcgapi.com/api/allSetCards/',
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

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `OPTCG API returned status ${response.status}`,
        message: 'The legacy One Piece API is unavailable. Try using JustTCG instead.',
      }, { status: response.status });
    }

    const allCards = await response.json();
    const searchTerm = query.toLowerCase();
    
    const filteredCards = Array.isArray(allCards)
      ? allCards.filter((card: any) => {
          const cardName = (card.name || card.card_name || card.title || '').toLowerCase();
          const setName = (card.set_name || card.set || '').toLowerCase();
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
      cards: filteredCards.slice(0, 200).map((card: any) => {
        const imageUrl = card.image || card.image_url || card.card_image || '';
        const setCode = card.set_code || card.set_id || card.set || 'OP';
        const collectorNum = String(card.card_number || card.number || card.collector_number || card.id || '');
        
        return {
          id: `optcg-${setCode}-${collectorNum}`.toLowerCase().replace(/\s+/g, '-'),
          name: card.name || card.card_name || card.title || 'Unknown Card',
          setName: card.set_name || card.set || '',
          setCode: setCode,
          collectorNumber: collectorNum,
          rarity: card.rarity || card.card_rarity || 'common',
          imageUrl: imageUrl,
          colors: card.color ? (Array.isArray(card.color) ? card.color : [card.color]) : [],
          type: card.type || card.card_type || '',
          price: card.price || null,
        };
      }),
    });

  } catch (error) {
    console.error('OPTCG API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Legacy One Piece API unavailable',
      message: 'The OPTCG API is down. Please use JustTCG as the data source.',
    }, { status: 503 });
  }
}
