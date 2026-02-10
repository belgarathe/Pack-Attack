import { prisma } from '@/lib/prisma';

// SSE endpoint for real-time chat messages
export async function GET() {
  const encoder = new TextEncoder();
  let lastMessageTime: Date | null = null;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode('event: connected\ndata: {}\n\n'));

      // Get the current time as baseline to avoid sending old messages
      lastMessageTime = new Date();

      // Poll for new messages every 2 seconds
      const poll = async () => {
        if (closed) return;

        try {
          const newMessages = await prisma.chatMessage.findMany({
            where: lastMessageTime
              ? { createdAt: { gt: lastMessageTime } }
              : {},
            orderBy: { createdAt: 'asc' },
            take: 50,
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  twitchUsername: true,
                  role: true,
                },
              },
            },
          });

          if (newMessages.length > 0) {
            lastMessageTime = newMessages[newMessages.length - 1].createdAt;

            for (const msg of newMessages) {
              const data = JSON.stringify({
                id: msg.id,
                content: msg.content,
                createdAt: msg.createdAt.toISOString(),
                user: {
                  id: msg.user.id,
                  name: msg.user.twitchUsername || msg.user.name || 'Anonymous',
                  image: msg.user.image,
                  isTwitch: !!msg.user.twitchUsername,
                  role: msg.user.role,
                },
              });
              controller.enqueue(encoder.encode(`event: message\ndata: ${data}\n\n`));
            }
          }

          // Send heartbeat to keep connection alive
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (error) {
          // Don't crash on DB errors, just skip this poll
          console.error('Chat stream poll error:', error);
        }

        if (!closed) {
          setTimeout(poll, 2000);
        }
      };

      // Start polling
      poll();
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering for SSE
    },
  });
}
