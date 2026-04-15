import { prisma } from './prisma';

export interface AuditLogParams {
  tenantId?: string;
  userId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  req?: Request;
}

export async function logAction(params: AuditLogParams): Promise<void> {
  try {
    let ipAddress = params.ipAddress;
    let userAgent = params.userAgent;

    if (params.req) {
      ipAddress = getClientIp(params.req) || ipAddress;
      userAgent = params.req.headers.get('user-agent') || userAgent;
    }

    await prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        meta: params.meta,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error('Error logging audit action:', error);
  }
}

function getClientIp(req: Request): string | null {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return null;
}

export async function getAuditLogs(
  tenantId: string,
  limit: number = 50,
  offset: number = 0
): Promise<unknown[]> {
  return prisma.auditLog.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

export async function getAuditLogsCount(tenantId: string): Promise<number> {
  return prisma.auditLog.count({
    where: { tenantId },
  });
}
