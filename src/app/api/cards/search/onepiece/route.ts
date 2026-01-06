import { NextResponse } from 'next/server';
import { searchJustTCG, isJustTCGConfigured } from '@/lib/justtcg';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const source = searchParams.get('source') || 'apitcg'; // Default to API TCG (most reliable for One Piece)

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
  }

  // Try API TCG first (most reliable for One Piece)
  if (source === 'apitcg' || source === 'default') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      // API TCG endpoint for One Piece cards with search
      const apiUrl = `https://apitcg.com/api/one-piece/cards?name=${encodeURIComponent(query)}`;
      
      // API TCG may require an API key - check if configured
      const apiKey = process.env.APITCG_API_KEY;
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'User-Agent': 'Pack-Attack/1.0',
      };
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }
      
      const response = await fetch(apiUrl, {
        headers,
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const cards = Array.isArray(data) ? data : (data.cards || data.data || []);
        
        if (cards.length === 0) {
          return NextResponse.json({
            success: true,
            cards: [],
            message: 'No cards found matching your search',
          });
        }

        return NextResponse.json({
          success: true,
          cards: cards.slice(0, 50).map((card: any) => {
            const imageUrl = card.image || card.imageUrl || card.image_url || '';
            const setCode = card.set || card.setCode || card.set_code || 'OP';
            const collectorNum = String(card.number || card.collectorNumber || card.collector_number || card.id || '');
            
            return {
              id: `op-${setCode}-${collectorNum}`.toLowerCase().replace(/\s+/g, '-'),
              name: card.name || 'Unknown Card',
              setName: card.setName || card.set_name || card.set || '',
              setCode: setCode,
              collectorNumber: collectorNum,
              rarity: card.rarity || 'common',
              imageUrl: imageUrl,
              colors: card.color ? (Array.isArray(card.color) ? card.color : [card.color]) : [],
              type: card.type || card.category || '',
              price: card.price || null,
            };
          }),
        });
      }
      
      console.warn('API TCG returned non-OK status:', response.status);
      // Fall through to try JustTCG
    } catch (error) {
      console.warn('API TCG error, trying fallback:', error);
      // Fall through to try JustTCG
    }
  }

  // Try JustTCG as fallback
  if (isJustTCGConfigured()) {
    const result = await searchJustTCG('onepiece', query, 20);
    if (result.success && result.cards && result.cards.length > 0) {
      return NextResponse.json(result);
    }
  }

  // Final fallback: Try OPTCG API
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
        error: 'One Piece card search unavailable',
        message: 'All One Piece card APIs are currently unavailable. Please try again later.',
      }, { status: 503 });
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
      cards: filteredCards.slice(0, 50).map((card: any) => {
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
    console.error('All One Piece APIs failed:', error);
    return NextResponse.json({
      success: false,
      error: 'One Piece card search unavailable',
      message: 'All One Piece card APIs are currently unavailable. Please try again later.',
    }, { status: 503 });
  }
}
