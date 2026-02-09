import { NextResponse } from 'next/server';
import { searchJustTCG, isJustTCGConfigured } from '@/lib/justtcg';

// Cache for One Piece cards (in-memory, refreshed on server restart)
let cachedCards: any[] | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

async function fetchAllOnePieceCards(): Promise<any[]> {
  // Return cached data if valid
  if (cachedCards && Date.now() - cacheTime < CACHE_DURATION) {
    return cachedCards;
  }

  // OPTCG API - use ?format=json to get pure JSON (not the browsable API HTML)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s - response is large

    const response = await fetch('https://optcgapi.com/api/allSetCards/?format=json', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Pack-Attack/1.0',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const cards = Array.isArray(data) ? data : (data.cards || data.data || []);

      if (cards.length > 0) {
        console.log(`Loaded ${cards.length} One Piece cards from OPTCG API`);
        cachedCards = cards;
        cacheTime = Date.now();
        return cards;
      }
    }
  } catch (error) {
    console.warn('Failed to fetch from OPTCG API:', error);
  }

  return [];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const source = searchParams.get('source') || 'default';

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
  }

  // Try JustTCG first if configured and requested
  if (source === 'justtcg' && isJustTCGConfigured()) {
    const result = await searchJustTCG('onepiece', query, 20);
    if (result.success && result.cards && result.cards.length > 0) {
      return NextResponse.json(result);
    }
  }

  // Use OPTCG API with local filtering
  try {
    const allCards = await fetchAllOnePieceCards();

    if (allCards.length === 0) {
      // If we couldn't fetch cards, try JustTCG as last resort
      if (isJustTCGConfigured()) {
        const result = await searchJustTCG('onepiece', query, 20);
        if (result.success) {
          return NextResponse.json(result);
        }
      }

      return NextResponse.json({
        success: false,
        error: 'One Piece card search unavailable',
        message: 'Could not connect to One Piece card APIs. Please try again later.',
      }, { status: 503 });
    }

    const searchTerm = query.toLowerCase().trim();

    // Filter cards matching the search term
    // OPTCG API uses: card_name, set_name, card_set_id, card_color, card_type
    const filteredCards = allCards.filter((card: any) => {
      const cardName = (card.card_name || card.name || card.title || '').toLowerCase();
      const setName = (card.set_name || card.set || card.extSet || '').toLowerCase();
      const cardId = (card.card_set_id || card.id || card.card_id || '').toLowerCase();
      const cardColor = (card.card_color || card.color || '').toLowerCase();
      const subTypes = (card.sub_types || '').toLowerCase();

      return cardName.includes(searchTerm) ||
             setName.includes(searchTerm) ||
             cardId.includes(searchTerm) ||
             cardColor.includes(searchTerm) ||
             subTypes.includes(searchTerm);
    });

    if (filteredCards.length === 0) {
      return NextResponse.json({
        success: true,
        cards: [],
        message: 'No cards found matching your search',
      });
    }

    // Map to standard format
    // OPTCG fields: card_name, set_name, set_id, card_set_id, rarity, card_image,
    //               card_color, card_type, card_cost, card_power, market_price, inventory_price
    const mappedCards = filteredCards.slice(0, 50).map((card: any) => {
      // OPTCG provides card_image as full URL
      const imageUrl = card.card_image ||
                      card.image ||
                      card.image_url ||
                      card.img ||
                      card.imageUrl ||
                      card.art ||
                      '';

      const setCode = card.set_id ||
                     card.set_code ||
                     card.set ||
                     card.extSet ||
                     'OP';

      const collectorNum = String(
        card.card_set_id ||
        card.card_number ||
        card.number ||
        card.collector_number ||
        card.extCardNumber ||
        card.id ||
        ''
      );

      // Use market_price or inventory_price from OPTCG
      const price = card.market_price || card.inventory_price || card.price || null;

      return {
        id: `op-${setCode}-${collectorNum}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        name: card.card_name || card.name || card.title || 'Unknown Card',
        setName: card.set_name || card.set || card.extSet || '',
        setCode: setCode,
        collectorNumber: collectorNum,
        rarity: (card.rarity || card.card_rarity || 'common').toLowerCase(),
        imageUrl: imageUrl,
        colors: card.card_color
          ? (Array.isArray(card.card_color) ? card.card_color : [card.card_color])
          : (card.color
            ? (Array.isArray(card.color) ? card.color : [card.color])
            : (card.colors || [])),
        type: card.card_type || card.type || card.category || '',
        price: price,
      };
    });

    return NextResponse.json({
      success: true,
      cards: mappedCards,
      total: filteredCards.length,
    });

  } catch (error) {
    console.error('One Piece API error:', error);

    // Try JustTCG as last resort
    if (isJustTCGConfigured()) {
      const result = await searchJustTCG('onepiece', query, 20);
      if (result.success) {
        return NextResponse.json(result);
      }
    }

    return NextResponse.json({
      success: false,
      error: 'One Piece card search failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    }, { status: 500 });
  }
}
