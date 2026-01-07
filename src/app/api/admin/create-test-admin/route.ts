import { NextResponse } from 'next/server';

/**
 * THIS ENDPOINT IS DISABLED FOR SECURITY
 * 
 * To create an admin user, use the secure script:
 * npx tsx scripts/create-admin.ts
 * 
 * This script requires interactive input or secure environment variables
 * and enforces strong password requirements.
 */
export async function POST() {
  // Check if this is development environment
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { 
        error: 'This endpoint is disabled in production',
        instruction: 'Use: npx tsx scripts/create-admin.ts',
      },
      { status: 403 }
    );
  }

  return NextResponse.json(
    { 
      error: 'This endpoint is disabled for security',
      instruction: 'Use: npx tsx scripts/create-admin.ts',
      note: 'Admin creation requires strong password validation via the secure script'
    },
    { status: 403 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
















