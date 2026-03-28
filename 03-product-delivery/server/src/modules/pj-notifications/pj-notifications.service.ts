import { getDatabase } from '../../database/connection.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCode } from '../../shared/errors/error-codes.js';
import type { ListNotificationsInput } from './pj-notifications.schema.js';

interface NotificationRow {
  id: string;
  company_id: string;
  user_id: string | null;
  title: string;
  body: string;
  type: string;
  is_read: number;
  created_at: string;
}

function mapNotifRow(row: NotificationRow) {
  return {
    id: row.id,
    companyId: row.company_id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    type: row.type,
    isRead: row.is_read === 1,
    createdAt: row.created_at,
  };
}

export function listNotifications(companyId: string, userId: string, input: ListNotificationsInput) {
  const db = getDatabase();
  const conditions = ['company_id = ?', '(user_id IS NULL OR user_id = ?)'];
  const params: (string | number)[] = [companyId, userId];

  if (input.type) {
    conditions.push('type = ?');
    params.push(input.type);
  }

  const where = conditions.join(' AND ');
  const offset = (input.page - 1) * input.limit;

  const total = db.prepare(`SELECT COUNT(*) as count FROM pj_notifications WHERE ${where}`).get(...params) as { count: number };
  const rows = db.prepare(
    `SELECT * FROM pj_notifications WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, input.limit, offset) as NotificationRow[];

  return {
    data: rows.map(mapNotifRow),
    total: total.count,
    page: input.page,
    limit: input.limit,
  };
}

export function getUnreadCount(companyId: string, userId: string) {
  const db = getDatabase();
  const result = db.prepare(
    "SELECT COUNT(*) as count FROM pj_notifications WHERE company_id = ? AND (user_id IS NULL OR user_id = ?) AND is_read = 0"
  ).get(companyId, userId) as { count: number };

  return { unreadCount: result.count };
}

export function markAsRead(companyId: string, notificationId: string) {
  const db = getDatabase();

  const notif = db.prepare(
    'SELECT id FROM pj_notifications WHERE id = ? AND company_id = ?'
  ).get(notificationId, companyId) as { id: string } | undefined;

  if (!notif) {
    throw new AppError(404, ErrorCode.NOTIFICATION_NOT_FOUND, 'Notificacao nao encontrada');
  }

  db.prepare('UPDATE pj_notifications SET is_read = 1 WHERE id = ?').run(notificationId);

  return { success: true };
}

export function markAllAsRead(companyId: string, userId: string) {
  const db = getDatabase();
  db.prepare(
    "UPDATE pj_notifications SET is_read = 1 WHERE company_id = ? AND (user_id IS NULL OR user_id = ?) AND is_read = 0"
  ).run(companyId, userId);

  return { success: true };
}
