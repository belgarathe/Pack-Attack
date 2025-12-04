import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent': 'PackAttack/1.0',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Scryfall API error' }, { status: response.status });
    }

    const data = await response.json();
    
    const cards = data.data?.map((card: any) => ({
      id: card.id,
      name: card.name,
      setName: card.set_name,
      setCode: card.set,
      collectorNumber: card.collector_number,
      rarity: card.rarity,
      imageUrl: card.image_uris?.normal || card.image_uris?.large || card.image_uris?.small,
      imageUrlSmall: card.image_uris?.small,
      imageUrlLarge: card.image_uris?.large,
      colors: card.colors || [],
      type: card.type_line,
      manaCost: card.mana_cost,
      cmc: card.cmc,
      priceUsd: card.prices?.usd || null,
      priceEur: card.prices?.eur || null,
    })) || [];

    return NextResponse.json({ success: true, cards });
  } catch (error) {
    console.error('Scryfall API error:', error);
    return NextResponse.json({ error: 'Failed to search cards' }, { status: 500 });
  }
}

