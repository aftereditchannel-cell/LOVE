import { Request, Response, NextFunction } from 'express';

/**
 * COUPLE ISOLATION — Most important security rule.
 *
 * Every request MUST be validated against:
 * 1. Authenticated identity
 * 2. Token scope
 * 3. Couple membership
 * 4. Resource ownership
 *
 * User A must NEVER access another couple's data by changing IDs.
 */
export function coupleIsolationMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!user.coupleId) {
    return res.status(403).json({ error: 'Not paired with a partner' });
  }

  // Verify couple ID from header matches authenticated user's couple
  const headerCoupleId = req.headers['x-couple-id'];
  if (headerCoupleId && headerCoupleId !== user.coupleId) {
    // Attempted couple isolation bypass — log this as security event
    console.warn(`[SECURITY] Couple isolation violation attempt: user=${user.userId} claimed coupleId=${headerCoupleId} actual=${user.coupleId}`);
    return res.status(403).json({ error: 'Access denied' });
  }

  next();
}

/**
 * Verify that a resource belongs to the authenticated user's couple.
 */
export function verifyCoupleOwnership(resourceCoupleId: string, userCoupleId: string): boolean {
  return resourceCoupleId === userCoupleId;
}

/**
 * Verify that a private resource belongs to the requesting user.
 */
export function verifyPrivateAccess(resourceOwnerId: string, userId: string, privacy: string): boolean {
  if (privacy === 'SHARED') return true;
  return resourceOwnerId === userId;
}
