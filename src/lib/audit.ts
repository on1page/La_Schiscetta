// =====================================================================
// audit.ts - Audit log immutabile delle azioni amministrative
// OWASP A09: ogni azione registrata con utente, timestamp, IP,
// user agent e payload pre/post. Conservazione 12 mesi.
// =====================================================================
import { db } from "./db";
import { getClientIp, getUserAgent } from "./security";
import { toJson } from "./json";

export type AuditInput = {
  actorId?: string | null;
  actorName: string;
  action: string;
  entity?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
};

export async function audit(req: Request, input: AuditInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorName: input.actorName,
        action: input.action,
        entity: input.entity ?? null,
        entityId: input.entityId ?? null,
        before: input.before === undefined ? null : toJson(input.before),
        after: input.after === undefined ? null : toJson(input.after),
        ip: getClientIp(req),
        userAgent: getUserAgent(req),
      },
    });
  } catch (e) {
    // l'audit non deve mai bloccare l'operazione, ma l'errore va loggato
    console.error("[audit] errore scrittura audit log:", e);
  }
}
