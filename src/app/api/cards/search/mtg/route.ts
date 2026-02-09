import { NextResponse } from 'next/server';
import { searchJustTCG, isJustTCGConfigured } from '@/lib/justtcg';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const source = searchParams.get('source') || 'scryfall'; // 'scryfall' or 'justtcg'

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
    
    const result = await searchJustTCG('mtg', query, 20);
    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json(result);
  }

  // Default: Use Scryfall API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent': 'PackAttack/1.0',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ success: true, cards: [], message: 'No cards found' });
      }
      
      // Fallback to JustTCG on Scryfall error
      if (isJustTCGConfigured()) {
        const result = await searchJustTCG('mtg', query, 20);
        if (result.success) {
          return NextResponse.json(result);
        }
      }

      return NextResponse.json({ error: 'Scryfall API error' }, { status: response.status });
    }

    const data = await response.json();
    
    const cards = data.data?.slice(0, 200).map((card: any) => ({
      id: card.id,
      name: card.name,
      setName: card.set_name,
      setCode: card.set,
      collectorNumber: card.collector_number,
      rarity: card.rarity,
      imageUrl: card.image_uris?.normal || card.image_uris?.large || card.image_uris?.small || 
                (card.card_faces?.[0]?.image_uris?.normal) || '',
      imageUrlSmall: card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small,
      imageUrlLarge: card.image_uris?.large || card.card_faces?.[0]?.image_uris?.large,
      colors: card.colors || [],
      type: card.type_line,
      manaCost: card.mana_cost,
      cmc: card.cmc,
      priceUsd: card.prices?.usd || null,
      priceEur: card.prices?.eur || null,
    })).filter((card: any) => card.imageUrl) || [];

    return NextResponse.json({ success: true, cards, total: data.total_cards || cards.length });
  } catch (error) {
    console.error('Scryfall API error:', error);
    
    // Fallback to JustTCG on timeout/error
    if (isJustTCGConfigured()) {
      const result = await searchJustTCG('mtg', query, 20);
      if (result.success) {
        return NextResponse.json(result);
      }
    }

    return NextResponse.json({ error: 'Failed to search cards' }, { status: 500 });
  }
}
