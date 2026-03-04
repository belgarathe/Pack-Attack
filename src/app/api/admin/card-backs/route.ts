import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readdir, writeFile } from 'fs/promises';
import { join } from 'path';

const CARD_BACKS_DIR = join(process.cwd(), 'public', 'assets', 'card-backs');
const ALLOWED_TYPES = ['image/png', 'image/jpeg'];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg'];
const TARGET_RATIO = 63 / 88; // ~0.7159
const RATIO_TOLERANCE = 0.025;
const MIN_W = 400;
const MIN_H = 559;
const MAX_W = 630;
const MAX_H = 880;

async function requireAdmin() {
  const session = await getCurrentSession();
  if (!session?.user?.email) return null;
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== 'ADMIN') return null;
  return user;
}

// GET — list available card back filenames
export async function GET() {
  try {
    const user = await requireAdmin();
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const entries = await readdir(CARD_BACKS_DIR);
    const files = entries.filter(f => {
      const lower = f.toLowerCase();
      return ALLOWED_EXTENSIONS.some(ext => lower.endsWith(ext));
    });

    return NextResponse.json({ success: true, files });
  } catch (error) {
    console.error('Card backs list error:', error);
    return NextResponse.json({ error: 'Failed to list card backs' }, { status: 500 });
  }
}

// POST — upload a new card back image
export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate MIME type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only PNG and JPG files are allowed' }, { status: 400 });
    }

    const ext = file.type === 'image/png' ? '.png' : '.jpg';
    const originalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const baseName = originalName.replace(/\.[^.]+$/, '');
    const filename = `${baseName}${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    // Server-side dimension validation
    let width: number;
    let height: number;

    if (file.type === 'image/png') {
      // PNG: width at bytes 16–19, height at bytes 20–23 (big-endian)
      if (buffer.length < 24) {
        return NextResponse.json({ error: 'Invalid PNG file' }, { status: 400 });
      }
      // Verify PNG signature: 8 bytes
      const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
      for (let i = 0; i < 8; i++) {
        if (buffer[i] !== PNG_SIG[i]) {
          return NextResponse.json({ error: 'Invalid PNG signature' }, { status: 400 });
        }
      }
      width = buffer.readUInt32BE(16);
      height = buffer.readUInt32BE(20);
    } else {
      // JPEG: scan for SOF0/SOF2 markers (0xFF 0xC0 or 0xFF 0xC2)
      // JPEG signature: FF D8
      if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
        return NextResponse.json({ error: 'Invalid JPG file' }, { status: 400 });
      }
      let pos = 2;
      let found = false;
      width = 0;
      height = 0;
      while (pos < buffer.length - 8) {
        if (buffer[pos] !== 0xff) break;
        const marker = buffer[pos + 1];
        const segLen = buffer.readUInt16BE(pos + 2);
        // SOF0 = 0xC0, SOF2 = 0xC2
        if (marker === 0xc0 || marker === 0xc2) {
          height = buffer.readUInt16BE(pos + 5);
          width = buffer.readUInt16BE(pos + 7);
          found = true;
          break;
        }
        pos += 2 + segLen;
      }
      if (!found) {
        return NextResponse.json({ error: 'Could not read JPEG dimensions' }, { status: 400 });
      }
    }

    // Size validation
    if (width < MIN_W || height < MIN_H) {
      return NextResponse.json({
        error: `Image too small: ${width}×${height}px. Minimum is ${MIN_W}×${MIN_H}px.`,
      }, { status: 400 });
    }
    if (width > MAX_W || height > MAX_H) {
      return NextResponse.json({
        error: `Image too large: ${width}×${height}px. Maximum is ${MAX_W}×${MAX_H}px.`,
      }, { status: 400 });
    }

    // Aspect ratio validation (63:88)
    const ratio = width / height;
    if (Math.abs(ratio - TARGET_RATIO) > RATIO_TOLERANCE) {
      return NextResponse.json({
        error: `Wrong aspect ratio: ${width}×${height}px. Expected 63:88 (≈0.716). Got ${ratio.toFixed(3)}.`,
      }, { status: 400 });
    }

    // Save file
    const dest = join(CARD_BACKS_DIR, filename);
    await writeFile(dest, buffer);

    return NextResponse.json({ success: true, filename });
  } catch (error) {
    console.error('Card back upload error:', error);
    return NextResponse.json({ error: 'Failed to upload card back' }, { status: 500 });
  }
}
