import { getDatabase } from '../../database/connection.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCode } from '../../shared/errors/error-codes.js';
import { generateId } from '../../shared/utils/uuid.js';
import { logAudit } from '../../shared/utils/audit-log.js';
import type { InviteMemberInput, UpdateRoleInput } from './team.schema.js';

interface MemberRow {
  id: string;
  company_id: string;
  user_id: string;
  role: string;
  name: string;
  email: string;
  status: string;
  invited_at: string;
  accepted_at: string | null;
  removed_at: string | null;
}

function mapMemberRow(row: MemberRow) {
  return {
    id: row.id,
    companyId: row.company_id,
    userId: row.user_id,
    role: row.role,
    name: row.name,
    email: row.email,
    status: row.status,
    invitedAt: row.invited_at,
    acceptedAt: row.accepted_at,
    removedAt: row.removed_at,
  };
}

export function inviteMember(companyId: string, userId: string, input: InviteMemberInput) {
  const db = getDatabase();

  const existing = db.prepare(
    "SELECT id FROM team_members WHERE company_id = ? AND email = ? AND status != 'removed'"
  ).get(companyId, input.email);

  if (existing) {
    throw new AppError(409, ErrorCode.MEMBER_ALREADY_EXISTS, 'Membro já cadastrado na empresa');
  }

  const memberId = generateId();
  const memberUserId = generateId(); // Placeholder until user accepts invite

  db.transaction(() => {
    db.prepare(`
      INSERT INTO team_members (id, company_id, user_id, role, name, email, status)
      VALUES (?, ?, ?, ?, ?, ?, 'invited')
    `).run(memberId, companyId, memberUserId, input.role, input.name, input.email);

    db.prepare(`
      INSERT INTO pj_notifications (id, company_id, user_id, title, body, type)
      VALUES (?, ?, NULL, ?, ?, 'team')
    `).run(generateId(), companyId, 'Novo membro convidado', `${input.name} foi convidado como ${input.role}`);

    logAudit(db, {
      companyId,
      userId,
      action: 'add_member',
      resource: 'team_member',
      resourceId: memberId,
      metadata: { email: input.email, role: input.role },
    });
  })();

  const member = db.prepare('SELECT * FROM team_members WHERE id = ?').get(memberId) as MemberRow;
  return mapMemberRow(member);
}

export function listMembers(companyId: string) {
  const db = getDatabase();
  const members = db.prepare(
    "SELECT * FROM team_members WHERE company_id = ? AND status != 'removed' ORDER BY invited_at ASC"
  ).all(companyId) as MemberRow[];
  return members.map(mapMemberRow);
}

export function updateMemberRole(companyId: string, userId: string, memberId: string, input: UpdateRoleInput) {
  const db = getDatabase();

  const member = db.prepare(
    "SELECT * FROM team_members WHERE id = ? AND company_id = ? AND status != 'removed'"
  ).get(memberId, companyId) as MemberRow | undefined;

  if (!member) {
    throw new AppError(404, ErrorCode.MEMBER_NOT_FOUND, 'Membro não encontrado');
  }

  db.transaction(() => {
    db.prepare('UPDATE team_members SET role = ? WHERE id = ?').run(input.role, memberId);

    logAudit(db, {
      companyId,
      userId,
      action: 'update_member_role',
      resource: 'team_member',
      resourceId: memberId,
      metadata: { oldRole: member.role, newRole: input.role },
    });
  })();

  const updated = db.prepare('SELECT * FROM team_members WHERE id = ?').get(memberId) as MemberRow;
  return mapMemberRow(updated);
}

export function removeMember(companyId: string, userId: string, memberId: string) {
  const db = getDatabase();

  const member = db.prepare(
    "SELECT * FROM team_members WHERE id = ? AND company_id = ? AND status != 'removed'"
  ).get(memberId, companyId) as MemberRow | undefined;

  if (!member) {
    throw new AppError(404, ErrorCode.MEMBER_NOT_FOUND, 'Membro não encontrado');
  }

  // Check if member is the company owner
  const company = db.prepare('SELECT owner_user_id FROM companies WHERE id = ?').get(companyId) as { owner_user_id: string };
  if (member.user_id === company.owner_user_id) {
    throw new AppError(400, ErrorCode.CANNOT_REMOVE_OWNER, 'Não é possível remover o proprietário da empresa');
  }

  db.transaction(() => {
    db.prepare("UPDATE team_members SET status = 'removed', removed_at = datetime('now') WHERE id = ?")
      .run(memberId);

    logAudit(db, {
      companyId,
      userId,
      action: 'remove_member',
      resource: 'team_member',
      resourceId: memberId,
      metadata: { name: member.name, email: member.email },
    });
  })();

  return { success: true };
}
