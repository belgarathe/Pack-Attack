import { NextResponse } from 'next/server';

// List of One Piece API endpoints to try (in order of preference)
const API_ENDPOINTS = [
  {
    name: 'OPTCG API v1',
    url: 'https://optcgapi.com/api/allSetCards/',
    type: 'all'
  },
  {
    name: 'OPTCG API Filtered',
    url: 'https://optcgapi.com/api/cards/',
    type: 'search'
  }
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
  }

  const errors: string[] = [];

  // Try each API endpoint
  for (const endpoint of API_ENDPOINTS) {
    try {
      const url = endpoint.type === 'search' 
        ? `${endpoint.url}?name=${encodeURIComponent(query)}`
        : endpoint.url;
        
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Pack-Attack/1.0',
        },
        cache: 'no-store',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        errors.push(`${endpoint.name}: HTTP ${response.status}`);
        continue;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        errors.push(`${endpoint.name}: Not JSON response`);
        continue;
      }

      const data = await response.json();
      
      if (!data || (Array.isArray(data) && data.length === 0)) {
        errors.push(`${endpoint.name}: Empty response`);
        continue;
      }

      // Success! Process and return the cards
      return processCards(data, query);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`${endpoint.name}: ${errorMsg}`);
      continue;
    }
  }

  // All endpoints failed
  console.error('All One Piece API endpoints failed:', errors);
  return NextResponse.json({ 
    success: false,
    error: 'One Piece card API is currently unavailable',
    message: 'The One Piece TCG API (optcgapi.com) appears to be down. Please try again later or use Magic: The Gathering or Pokémon cards instead.',
    details: errors.join('; ')
  }, { status: 503 });
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
    cards: filteredCards.slice(0, 200).map((card: any) => {
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
      
      // Create a TRULY unique ID using set code + collector number
      const setCode = card.set_code || card.set_id || card.set || 'OP';
      const collectorNum = String(card.card_number || card.number || card.collector_number || card.id || '');
      const uniqueId = `optcg-${setCode}-${collectorNum}`.toLowerCase().replace(/\s+/g, '-');
      
      return {
        id: uniqueId, // Use our unique ID as the primary identifier
        name: card.name || card.card_name || card.title || 'Unknown Card',
        setName: card.set_name || card.set || card.set_id || '',
        setCode: setCode,
        collectorNumber: collectorNum,
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
