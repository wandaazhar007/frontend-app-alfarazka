export interface AuditLog {
  id: string;
  userId: string | null;
  userName: string | null;
  action: 'create' | 'update' | 'delete';
  entity: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}
