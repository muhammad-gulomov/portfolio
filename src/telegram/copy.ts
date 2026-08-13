import { OK_THRESHOLD } from './constants'
import type { CleaningMember } from './db'

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Tag that notifies the user in Telegram (HTML parse mode). */
export function tagMember(member: CleaningMember | null, fallbackId: number): string {
  if (!member) return `user ${fallbackId}`
  if (member.username) return `@${escapeHtml(member.username)}`
  return `<a href="tg://user?id=${member.telegram_user_id}">${escapeHtml(member.display_name)}</a>`
}

export function morningDutyMessage(
  tag: string,
  kind: 'fresh' | 'repeat' | 'after_pass',
): string {
  const dutyLine = `${tag}, it is your turn to remove the trash from the kitchen, nigga.`
  if (kind === 'repeat') {
    return (
      `${dutyLine}\n` +
      `Yesterday went unconfirmed, so the kitchen has thoughtfully reassigned you the same honour. Kindly complete it today.`
    )
  }
  if (kind === 'after_pass') {
    return (
      `${dutyLine}\n` +
      `The previous shift was cleared. Your distinguished appointment with the bin begins now.`
    )
  }
  return (
    `${dutyLine}\n` +
    `A formal opportunity for domestic excellence has been conferred upon you. Please proceed before the kitchen files a complaint.`
  )
}

export function eveningVoteMessage(tag: string, votes?: number): string {
  const head =
    `${tag}, evening review: did you remove the trash from the kitchen, nigga?\n` +
    `Colleagues (not the nominee): press OK if the matter is settled.`
  if (votes != null) {
    return `${head}\nApprovals: ${votes}/${OK_THRESHOLD}.`
  }
  return `${head}\n${OK_THRESHOLD} approvals required. Professional standards apply.`
}

export function eveningPassedMessage(tag: string, nextTag: string, count: number): string {
  return (
    `Confirmed: ${tag} has discharged kitchen duties (${count}/${OK_THRESHOLD}).\n` +
    `Next nominee: ${nextTag}. Try not to disappoint the bin.`
  )
}

export function adminPassMessage(prevTag: string, nextTag: string): string {
  return (
    `Admin override: ${prevTag} is credited — turn closed without the OK vote.\n` +
    `${nextTag}, it is your turn to remove the trash from the kitchen, nigga.\n` +
    `Fresh assignment for today. The bin awaits your professionalism.`
  )
}
