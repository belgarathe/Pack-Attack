import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type ImportItem = {
  name: string;
  quantity: number;
  price: number;
  category: string;
  game?: string;
  condition?: string;
  sku?: string;
  description?: string;
};

const VALID_CATEGORIES = [
  'SINGLE_CARD', 'BOOSTER_BOX', 'BOOSTER_PACK', 'STARTER_DECK',
  'STRUCTURE_DECK', 'ACCESSORIES', 'SLEEVES', 'PLAYMAT', 'BINDER', 'DECK_BOX', 'OTHER',
];

const VALID_GAMES = [
  'MAGIC_THE_GATHERING', 'ONE_PIECE', 'POKEMON', 'LORCANA', 'YUGIOH', 'FLESH_AND_BLOOD',
];

const VALID_CONDITIONS = [
  'MINT', 'NEAR_MINT', 'EXCELLENT', 'GOOD', 'LIGHT_PLAYED', 'PLAYED', 'POOR',
];

function parseTextImport(text: string): ImportItem[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const items: ImportItem[] = [];

  for (const line of lines) {
    if (line.startsWith('#') || line.startsWith('//')) continue;

    // Format: quantity x name | price | category | game | condition | sku
    // Or simpler: quantity x name | price
    // Or simplest: name (defaults to qty 1, price 0)
    const pipeMatch = line.match(/^(\d+)\s*x\s+(.+?)(?:\s*\|\s*(.+))?$/i);
    const simplePipeMatch = line.match(/^(.+?)(?:\s*\|\s*(.+))?$/);

    let quantity = 1;
    let name = '';
    let extraFields: string[] = [];

    if (pipeMatch) {
      quantity = parseInt(pipeMatch[1], 10);
      name = pipeMatch[2].trim();
      if (pipeMatch[3]) {
        extraFields = pipeMatch[3].split('|').map(f => f.trim());
      }
    } else if (simplePipeMatch) {
      name = simplePipeMatch[1].trim();
      if (simplePipeMatch[2]) {
        extraFields = simplePipeMatch[2].split('|').map(f => f.trim());
      }
    }

    if (!name) continue;

    const item: ImportItem = {
      name,
      quantity: Math.max(1, quantity),
      price: 0,
      category: 'SINGLE_CARD',
    };

    if (extraFields[0]) {
      const priceVal = parseFloat(extraFields[0].replace(',', '.').replace('€', '').trim());
      if (!isNaN(priceVal)) item.price = priceVal;
    }
    if (extraFields[1] && VALID_CATEGORIES.includes(extraFields[1].toUpperCase())) {
      item.category = extraFields[1].toUpperCase();
    }
    if (extraFields[2] && VALID_GAMES.includes(extraFields[2].toUpperCase())) {
      item.game = extraFields[2].toUpperCase();
    }
    if (extraFields[3] && VALID_CONDITIONS.includes(extraFields[3].toUpperCase())) {
      item.condition = extraFields[3].toUpperCase();
    }
    if (extraFields[4]) {
      item.sku = extraFields[4];
    }

    items.push(item);
  }

  return items;
}

function parseCsvImport(text: string): ImportItem[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(/[,;\t]/).map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const items: ImportItem[] = [];

  const nameIdx = headers.findIndex(h => ['name', 'card', 'card name', 'cardname', 'product', 'article'].includes(h));
  const qtyIdx = headers.findIndex(h => ['quantity', 'qty', 'amount', 'count', 'stock', 'anzahl', 'menge'].includes(h));
  const priceIdx = headers.findIndex(h => ['price', 'preis', 'cost', 'value', 'euro', 'eur'].includes(h));
  const catIdx = headers.findIndex(h => ['category', 'type', 'kategorie', 'typ'].includes(h));
  const gameIdx = headers.findIndex(h => ['game', 'tcg', 'spiel'].includes(h));
  const condIdx = headers.findIndex(h => ['condition', 'zustand', 'cond'].includes(h));
  const skuIdx = headers.findIndex(h => ['sku', 'id', 'article number', 'artikelnummer'].includes(h));

  if (nameIdx === -1) return [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(/[,;\t]/).map(v => v.trim().replace(/^"|"$/g, ''));
    const name = values[nameIdx];
    if (!name) continue;

    const item: ImportItem = {
      name,
      quantity: qtyIdx >= 0 ? Math.max(1, parseInt(values[qtyIdx], 10) || 1) : 1,
      price: priceIdx >= 0 ? parseFloat((values[priceIdx] || '0').replace(',', '.').replace('€', '')) || 0 : 0,
      category: 'SINGLE_CARD',
    };

    if (catIdx >= 0 && values[catIdx] && VALID_CATEGORIES.includes(values[catIdx].toUpperCase())) {
      item.category = values[catIdx].toUpperCase();
    }
    if (gameIdx >= 0 && values[gameIdx]) {
      const gameVal = values[gameIdx].toUpperCase().replace(/\s+/g, '_');
      if (VALID_GAMES.includes(gameVal)) item.game = gameVal;
    }
    if (condIdx >= 0 && values[condIdx] && VALID_CONDITIONS.includes(values[condIdx].toUpperCase())) {
      item.condition = values[condIdx].toUpperCase();
    }
    if (skuIdx >= 0 && values[skuIdx]) {
      item.sku = values[skuIdx];
    }

    items.push(item);
  }

  return items;
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { shop: true },
    });

    if (!user || (user.role !== 'SHOP_OWNER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Only shop owners can import stock' }, { status: 403 });
    }

    if (!user.shop) {
      return NextResponse.json({ error: 'You need to create a shop first' }, { status: 400 });
    }

    const contentType = request.headers.get('content-type') || '';
    let items: ImportItem[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const textData = formData.get('text') as string | null;
      const format = formData.get('format') as string | null;
      const defaultGame = formData.get('defaultGame') as string | null;
      const defaultCategory = formData.get('defaultCategory') as string | null;
      const defaultCondition = formData.get('defaultCondition') as string | null;

      if (file) {
        const text = await file.text();
        const ext = file.name.toLowerCase();

        if (ext.endsWith('.csv') || ext.endsWith('.tsv') || ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
          items = parseCsvImport(text);
        } else {
          items = parseTextImport(text);
        }
      } else if (textData) {
        if (format === 'csv') {
          items = parseCsvImport(textData);
        } else {
          items = parseTextImport(textData);
        }
      }

      if (defaultGame && VALID_GAMES.includes(defaultGame)) {
        items = items.map(item => ({ ...item, game: item.game || defaultGame }));
      }
      if (defaultCategory && VALID_CATEGORIES.includes(defaultCategory)) {
        items = items.map(item => ({
          ...item,
          category: item.category === 'SINGLE_CARD' ? defaultCategory : item.category,
        }));
      }
      if (defaultCondition && VALID_CONDITIONS.includes(defaultCondition)) {
        items = items.map(item => ({ ...item, condition: item.condition || defaultCondition }));
      }
    } else {
      const body = await request.json();
      if (body.text) {
        items = body.format === 'csv' ? parseCsvImport(body.text) : parseTextImport(body.text);
      }
    }

    if (items.length === 0) {
      return NextResponse.json({ error: 'No valid items found in import data' }, { status: 400 });
    }

    if (items.length > 500) {
      return NextResponse.json({ error: 'Maximum 500 items per import' }, { status: 400 });
    }

    const created: any[] = [];
    const updated: any[] = [];
    const errors: string[] = [];

    for (const item of items) {
      try {
        const existing = await prisma.shopProduct.findFirst({
          where: {
            shopId: user.shop.id,
            name: { equals: item.name, mode: 'insensitive' },
            ...(item.condition ? { condition: item.condition as any } : {}),
          },
        });

        if (existing) {
          const updatedProduct = await prisma.shopProduct.update({
            where: { id: existing.id },
            data: {
              stock: existing.stock + item.quantity,
              ...(item.price > 0 ? { price: item.price } : {}),
            },
          });
          updated.push({ name: item.name, quantity: item.quantity, newStock: updatedProduct.stock });
        } else {
          const newProduct = await prisma.shopProduct.create({
            data: {
              shopId: user.shop.id,
              name: item.name,
              price: item.price,
              category: item.category as any,
              game: item.game as any || null,
              condition: (item.condition as any) || 'NEAR_MINT',
              stock: item.quantity,
              sku: item.sku || null,
              isActive: true,
            },
          });
          created.push({ name: item.name, quantity: item.quantity, id: newProduct.id });
        }
      } catch (err: any) {
        errors.push(`Failed to import "${item.name}": ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalItems: items.length,
        created: created.length,
        updated: updated.length,
        errors: errors.length,
      },
      created,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error importing stock:', error);
    return NextResponse.json({ error: 'Failed to import stock' }, { status: 500 });
  }
}
