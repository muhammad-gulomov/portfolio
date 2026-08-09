export type CleaningGroup = {
  id: number
  chat_id: number
  current_member_id: number | null
  bound_at: string
}

export type CleaningMember = {
  id: number
  telegram_user_id: number
  display_name: string
  username: string | null
  sort_order: number
  active: number
}

export type DayStatus = 'pending' | 'voting' | 'passed' | 'failed'

export type CleaningDay = {
  id: number
  day_date: string
  duty_user_id: number
  status: DayStatus
  vote_message_id: number | null
  created_at: string
}

export async function getGroup(db: D1Database): Promise<CleaningGroup | null> {
  return db.prepare('SELECT * FROM cleaning_group WHERE id = 1').first<CleaningGroup>()
}

export async function bindGroup(db: D1Database, chatId: number, boundAt: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO cleaning_group (id, chat_id, current_member_id, bound_at)
       VALUES (1, ?, NULL, ?)
       ON CONFLICT(id) DO UPDATE SET chat_id = excluded.chat_id, bound_at = excluded.bound_at`,
    )
    .bind(chatId, boundAt)
    .run()
}

export async function setCurrentMember(db: D1Database, telegramUserId: number | null): Promise<void> {
  await db
    .prepare('UPDATE cleaning_group SET current_member_id = ? WHERE id = 1')
    .bind(telegramUserId)
    .run()
}

export async function listActiveMembers(db: D1Database): Promise<CleaningMember[]> {
  const { results } = await db
    .prepare(
      'SELECT * FROM cleaning_members WHERE active = 1 ORDER BY sort_order ASC, id ASC',
    )
    .all<CleaningMember>()
  return results ?? []
}

export async function getMemberByTelegramId(
  db: D1Database,
  telegramUserId: number,
): Promise<CleaningMember | null> {
  return db
    .prepare('SELECT * FROM cleaning_members WHERE telegram_user_id = ?')
    .bind(telegramUserId)
    .first<CleaningMember>()
}

export async function addMember(
  db: D1Database,
  telegramUserId: number,
  displayName: string,
  username: string | null,
): Promise<CleaningMember> {
  const existing = await getMemberByTelegramId(db, telegramUserId)
  if (existing) {
    await db
      .prepare(
        `UPDATE cleaning_members
         SET display_name = ?, username = ?, active = 1
         WHERE telegram_user_id = ?`,
      )
      .bind(displayName, username, telegramUserId)
      .run()
    const group = await getGroup(db)
    if (group && group.current_member_id == null) {
      await setCurrentMember(db, telegramUserId)
    }
    return (await getMemberByTelegramId(db, telegramUserId))!
  }

  const row = await db
    .prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM cleaning_members')
    .first<{ m: number }>()
  const sortOrder = (row?.m ?? -1) + 1

  await db
    .prepare(
      `INSERT INTO cleaning_members (telegram_user_id, display_name, username, sort_order, active)
       VALUES (?, ?, ?, ?, 1)`,
    )
    .bind(telegramUserId, displayName, username, sortOrder)
    .run()

  const group = await getGroup(db)
  if (group && group.current_member_id == null) {
    await setCurrentMember(db, telegramUserId)
  }

  return (await getMemberByTelegramId(db, telegramUserId))!
}

export async function deactivateMember(db: D1Database, telegramUserId: number): Promise<boolean> {
  const member = await getMemberByTelegramId(db, telegramUserId)
  if (!member || !member.active) return false
  await db
    .prepare('UPDATE cleaning_members SET active = 0 WHERE telegram_user_id = ?')
    .bind(telegramUserId)
    .run()

  const group = await getGroup(db)
  if (group?.current_member_id === telegramUserId) {
    const next = await nextActiveMember(db, telegramUserId)
    await setCurrentMember(db, next?.telegram_user_id ?? null)
  }
  return true
}

export async function nextActiveMember(
  db: D1Database,
  afterTelegramUserId: number,
): Promise<CleaningMember | null> {
  const members = await listActiveMembers(db)
  if (members.length === 0) return null
  const idx = members.findIndex((m) => m.telegram_user_id === afterTelegramUserId)
  if (idx < 0) return members[0]
  return members[(idx + 1) % members.length]
}

export async function getDayByDate(db: D1Database, dayDate: string): Promise<CleaningDay | null> {
  return db
    .prepare('SELECT * FROM cleaning_days WHERE day_date = ?')
    .bind(dayDate)
    .first<CleaningDay>()
}

export async function getDayById(db: D1Database, id: number): Promise<CleaningDay | null> {
  return db.prepare('SELECT * FROM cleaning_days WHERE id = ?').bind(id).first<CleaningDay>()
}

export async function createDay(
  db: D1Database,
  dayDate: string,
  dutyUserId: number,
  createdAt: string,
): Promise<CleaningDay> {
  const result = await db
    .prepare(
      `INSERT INTO cleaning_days (day_date, duty_user_id, status, vote_message_id, created_at)
       VALUES (?, ?, 'pending', NULL, ?)`,
    )
    .bind(dayDate, dutyUserId, createdAt)
    .run()
  const id = result.meta.last_row_id
  return (await getDayById(db, id))!
}

export async function updateDayStatus(
  db: D1Database,
  dayId: number,
  status: DayStatus,
  voteMessageId?: number | null,
): Promise<void> {
  if (voteMessageId !== undefined) {
    await db
      .prepare('UPDATE cleaning_days SET status = ?, vote_message_id = ? WHERE id = ?')
      .bind(status, voteMessageId, dayId)
      .run()
  } else {
    await db.prepare('UPDATE cleaning_days SET status = ? WHERE id = ?').bind(status, dayId).run()
  }
}

export async function countVotes(db: D1Database, dayId: number): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) AS c FROM cleaning_votes WHERE day_id = ?')
    .bind(dayId)
    .first<{ c: number }>()
  return row?.c ?? 0
}

export async function hasVoted(db: D1Database, dayId: number, voterUserId: number): Promise<boolean> {
  const row = await db
    .prepare('SELECT 1 AS x FROM cleaning_votes WHERE day_id = ? AND voter_user_id = ?')
    .bind(dayId, voterUserId)
    .first()
  return !!row
}

export async function addVote(
  db: D1Database,
  dayId: number,
  voterUserId: number,
  createdAt: string,
): Promise<boolean> {
  try {
    await db
      .prepare('INSERT INTO cleaning_votes (day_id, voter_user_id, created_at) VALUES (?, ?, ?)')
      .bind(dayId, voterUserId, createdAt)
      .run()
    return true
  } catch {
    return false
  }
}

export function mention(member: CleaningMember): string {
  if (member.username) return `@${member.username}`
  return member.display_name
}
