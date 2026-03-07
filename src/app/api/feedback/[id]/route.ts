import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const feedbackInclude = {
  claimedBy: { select: { id: true, name: true, email: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
};

// GET - Get single feedback with messages (for both admin and the feedback owner)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const feedback = await prisma.feedback.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        claimedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        messages: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!feedback) {
      return NextResponse.json({ success: false, error: 'Feedback not found.' }, { status: 404 });
    }

    const isAdmin = session.user.role === 'ADMIN';
    const isAuthor = feedback.userId === session.user.id;
    if (!isAdmin && !isAuthor) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ success: true, feedback });
  } catch (error) {
    console.error('Failed to fetch feedback:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch feedback.' }, { status: 500 });
  }
}

// PATCH - Update feedback (admin: status, notes, claim/unclaim, category, priority, assign; user: edit message)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    // ---- USER EDIT MESSAGE ----
    if (action === 'edit_message') {
      const { newMessage } = body;
      if (!newMessage || !newMessage.trim()) {
        return NextResponse.json({ success: false, error: 'Message cannot be empty.' }, { status: 400 });
      }
      if (newMessage.trim().length > 5000) {
        return NextResponse.json({ success: false, error: 'Message too long (max 5000 characters).' }, { status: 400 });
      }

      const feedback = await prisma.feedback.findUnique({ where: { id } });
      if (!feedback) {
        return NextResponse.json({ success: false, error: 'Feedback not found.' }, { status: 404 });
      }
      if (feedback.userId !== session.user.id) {
        return NextResponse.json({ success: false, error: 'You can only edit your own feedback.' }, { status: 403 });
      }
      if (feedback.status === 'CLOSED') {
        return NextResponse.json({ success: false, error: 'Cannot edit closed feedback.' }, { status: 400 });
      }

      // Preserve the original message on first edit
      const originalMessage = feedback.originalMessage || feedback.message;

      const [updated] = await prisma.$transaction([
        prisma.feedback.update({
          where: { id },
          data: {
            message: newMessage.trim(),
            originalMessage,
          },
          include: feedbackInclude,
        }),
        prisma.feedbackActivityLog.create({
          data: {
            feedbackId: id,
            userId: session.user.id,
            action: 'MESSAGE_EDITED',
            details: { previousMessage: feedback.message },
          },
        }),
      ]);

      return NextResponse.json({ success: true, feedback: updated });
    }

    // All actions below require admin role
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // ---- CLAIM ----
    if (action === 'claim') {
      const feedback = await prisma.feedback.findUnique({ where: { id } });
      if (!feedback) {
        return NextResponse.json({ success: false, error: 'Feedback not found.' }, { status: 404 });
      }
      if (feedback.claimedById && feedback.claimedById !== session.user.id) {
        return NextResponse.json(
          { success: false, error: 'This feedback is already claimed by another admin.' },
          { status: 409 }
        );
      }

      const [updated] = await prisma.$transaction([
        prisma.feedback.update({
          where: { id },
          data: {
            claimedById: session.user.id,
            claimedAt: new Date(),
            status: feedback.status === 'OPEN' ? 'CLAIMED' : feedback.status,
          },
          include: feedbackInclude,
        }),
        prisma.feedbackActivityLog.create({
          data: {
            feedbackId: id,
            userId: session.user.id,
            action: 'CLAIMED',
            details: { previousClaimerId: feedback.claimedById },
          },
        }),
      ]);

      return NextResponse.json({ success: true, feedback: updated });
    }

    // ---- UNCLAIM ----
    if (action === 'unclaim') {
      const feedback = await prisma.feedback.findUnique({ where: { id } });
      if (!feedback) {
        return NextResponse.json({ success: false, error: 'Feedback not found.' }, { status: 404 });
      }

      const [updated] = await prisma.$transaction([
        prisma.feedback.update({
          where: { id },
          data: {
            claimedById: null,
            claimedAt: null,
            status: feedback.status === 'CLAIMED' ? 'OPEN' : feedback.status,
          },
          include: feedbackInclude,
        }),
        prisma.feedbackActivityLog.create({
          data: {
            feedbackId: id,
            userId: session.user.id,
            action: 'UNCLAIMED',
            details: { previousClaimerId: feedback.claimedById },
          },
        }),
      ]);

      return NextResponse.json({ success: true, feedback: updated });
    }

    // ---- REASSIGN CATEGORY ----
    if (action === 'reassign_category') {
      const { newCategory } = body;
      const validCategories = ['BUG_REPORT', 'FEATURE_REQUEST', 'GENERAL', 'BATTLE_ISSUE', 'PACK_ISSUE', 'SHOP_ISSUE'];
      if (!newCategory || !validCategories.includes(newCategory)) {
        return NextResponse.json({ success: false, error: 'Invalid category.' }, { status: 400 });
      }

      const feedback = await prisma.feedback.findUnique({ where: { id } });
      if (!feedback) {
        return NextResponse.json({ success: false, error: 'Feedback not found.' }, { status: 404 });
      }
      if (feedback.category === newCategory) {
        return NextResponse.json({ success: false, error: 'Already in this category.' }, { status: 400 });
      }

      const [updated] = await prisma.$transaction([
        prisma.feedback.update({
          where: { id },
          data: { category: newCategory },
          include: feedbackInclude,
        }),
        prisma.feedbackActivityLog.create({
          data: {
            feedbackId: id,
            userId: session.user.id,
            action: 'CATEGORY_CHANGED',
            details: { from: feedback.category, to: newCategory },
          },
        }),
      ]);

      return NextResponse.json({ success: true, feedback: updated });
    }

    // ---- UPDATE PRIORITY ----
    if (action === 'update_priority') {
      const { priority } = body;
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
      if (!priority || !validPriorities.includes(priority)) {
        return NextResponse.json({ success: false, error: 'Invalid priority.' }, { status: 400 });
      }

      const feedback = await prisma.feedback.findUnique({ where: { id } });
      if (!feedback) {
        return NextResponse.json({ success: false, error: 'Feedback not found.' }, { status: 404 });
      }
      if (feedback.priority === priority) {
        return NextResponse.json({ success: true, feedback });
      }

      const [updated] = await prisma.$transaction([
        prisma.feedback.update({
          where: { id },
          data: { priority },
          include: feedbackInclude,
        }),
        prisma.feedbackActivityLog.create({
          data: {
            feedbackId: id,
            userId: session.user.id,
            action: 'PRIORITY_CHANGED',
            details: { from: feedback.priority, to: priority },
          },
        }),
      ]);

      return NextResponse.json({ success: true, feedback: updated });
    }

    // ---- ASSIGN TO ADMIN ----
    if (action === 'assign') {
      const { assignToUserId } = body;

      const feedback = await prisma.feedback.findUnique({ where: { id } });
      if (!feedback) {
        return NextResponse.json({ success: false, error: 'Feedback not found.' }, { status: 404 });
      }

      // Allow unassigning by passing null
      if (assignToUserId) {
        const targetUser = await prisma.user.findUnique({ where: { id: assignToUserId } });
        if (!targetUser || targetUser.role !== 'ADMIN') {
          return NextResponse.json({ success: false, error: 'Target user is not an admin.' }, { status: 400 });
        }
      }

      const [updated] = await prisma.$transaction([
        prisma.feedback.update({
          where: { id },
          data: {
            assignedToId: assignToUserId || null,
            assignedAt: assignToUserId ? new Date() : null,
          },
          include: feedbackInclude,
        }),
        prisma.feedbackActivityLog.create({
          data: {
            feedbackId: id,
            userId: session.user.id,
            action: 'ASSIGNED',
            details: {
              previousAssigneeId: feedback.assignedToId,
              newAssigneeId: assignToUserId || null,
            },
          },
        }),
      ]);

      return NextResponse.json({ success: true, feedback: updated });
    }

    // ---- UPDATE NOTES ----
    if (action === 'update_notes') {
      const { adminNotes } = body;

      const [updated] = await prisma.$transaction([
        prisma.feedback.update({
          where: { id },
          data: { adminNotes: adminNotes || null },
          include: feedbackInclude,
        }),
        prisma.feedbackActivityLog.create({
          data: {
            feedbackId: id,
            userId: session.user.id,
            action: 'NOTE_ADDED',
          },
        }),
      ]);

      return NextResponse.json({ success: true, feedback: updated });
    }

    // ---- STANDARD STATUS UPDATE ----
    const { status, adminNotes } = body;
    const validStatuses = ['OPEN', 'CLAIMED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status.' }, { status: 400 });
    }

    const feedback = await prisma.feedback.findUnique({ where: { id } });
    if (!feedback) {
      return NextResponse.json({ success: false, error: 'Feedback not found.' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    if (status === 'RESOLVED' && !feedback.resolvedAt) updateData.resolvedAt = new Date();

    const txOps: unknown[] = [
      prisma.feedback.update({
        where: { id },
        data: updateData,
        include: feedbackInclude,
      }),
    ];

    if (status && status !== feedback.status) {
      txOps.push(
        prisma.feedbackActivityLog.create({
          data: {
            feedbackId: id,
            userId: session.user.id,
            action: 'STATUS_CHANGED',
            details: { from: feedback.status, to: status },
          },
        })
      );

      // Auto-message user when ticket is closed
      if (status === 'CLOSED' && feedback.userId) {
        const closeMessage = feedback.category === 'BUG_REPORT'
          ? 'This bug has been fixed and your ticket is now closed. Thank you for helping us improve Pack Attack! If you enjoy the experience, we\'d love a review on Trustpilot.'
          : feedback.category === 'FEATURE_REQUEST'
          ? 'Your feature request has been reviewed and this ticket is now closed. Thanks for sharing your ideas with us! If you enjoy Pack Attack, we\'d appreciate a review on Trustpilot.'
          : 'Your feedback has been addressed and this ticket is now closed. Thank you for reaching out! If you enjoy your experience, we\'d love a review on Trustpilot.';

        txOps.push(
          prisma.feedbackMessage.create({
            data: {
              feedbackId: id,
              userId: session.user.id,
              content: closeMessage,
              isAdmin: true,
            },
          })
        );
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await prisma.$transaction(txOps as any);

    return NextResponse.json({ success: true, feedback: results[0] });
  } catch (error) {
    console.error('Failed to update feedback:', error);
    return NextResponse.json({ success: false, error: 'Failed to update feedback.' }, { status: 500 });
  }
}
