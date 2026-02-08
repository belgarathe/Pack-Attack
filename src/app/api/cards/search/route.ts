import { NextRequest, NextResponse } from 'next/server';

// Mock card database - replace with actual card API or database
const mockCards = [
  { id: 'card-1', name: 'Lightning Bolt', rarity: 'Common', imageUrl: 'https://cards.scryfall.io/art_crop/front/a/e/ae5f9fb1-5a22-4354-b810-e1b9e4b33e85.jpg', coinValue: 5 },
  { id: 'card-2', name: 'Black Lotus', rarity: 'Mythic', imageUrl: 'https://cards.scryfall.io/art_crop/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg', coinValue: 1000 },
  { id: 'card-3', name: 'Sol Ring', rarity: 'Uncommon', imageUrl: 'https://cards.scryfall.io/art_crop/front/1/9/199cde21-5bc3-49cd-acd4-bae3af6e5881.jpg', coinValue: 20 },
  { id: 'card-4', name: 'Counterspell', rarity: 'Common', imageUrl: 'https://cards.scryfall.io/art_crop/front/1/b/1b73577a-8ca1-41d7-9b2b-7300286fde43.jpg', coinValue: 8 },
  { id: 'card-5', name: 'Birds of Paradise', rarity: 'Rare', imageUrl: 'https://cards.scryfall.io/art_crop/front/f/e/feefe9f0-24a6-461c-9ef1-86c5a6f33b83.jpg', coinValue: 25 },
  { id: 'card-6', name: 'Dark Ritual', rarity: 'Common', imageUrl: 'https://cards.scryfall.io/art_crop/front/9/5/95f27eeb-6f14-4db3-adb9-9be5ed76b34b.jpg', coinValue: 6 },
  { id: 'card-7', name: 'Mox Ruby', rarity: 'Mythic', imageUrl: 'https://cards.scryfall.io/art_crop/front/4/5/45fd6e91-df76-497f-b642-33dc3d5f6a5a.jpg', coinValue: 800 },
  { id: 'card-8', name: 'Ancestral Recall', rarity: 'Mythic', imageUrl: 'https://cards.scryfall.io/art_crop/front/7/0/70e7ddf2-5604-41e7-bb9d-ddd03d3e9d0b.jpg', coinValue: 900 },
  { id: 'card-9', name: 'Giant Growth', rarity: 'Common', imageUrl: 'https://cards.scryfall.io/art_crop/front/0/6/06ec9e8b-4bd8-4caf-a559-6514b7ab4ca4.jpg', coinValue: 3 },
  { id: 'card-10', name: 'Swords to Plowshares', rarity: 'Uncommon', imageUrl: 'https://cards.scryfall.io/art_crop/front/e/5/e58e681e-a069-4414-aafe-634c7987fd0d.jpg', coinValue: 15 }
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.toLowerCase() || '';

    if (!query) {
      return NextResponse.json({ cards: [] });
    }

    // Filter cards based on search query
    const filteredCards = mockCards.filter(card => 
      card.name.toLowerCase().includes(query)
    );

    // Return max 10 results
    const results = filteredCards.slice(0, 10).map(card => ({
      ...card,
      id: `${card.id}-${Date.now()}`, // Generate unique ID for each search result
      pullRate: 0,
      coinValue: card.coinValue
    }));

    return NextResponse.json({ cards: results });
  } catch (error) {
    console.error('Card search error:', error);
    return NextResponse.json(
      { error: 'Failed to search cards' },
      { status: 500 }
    );
  }
}

