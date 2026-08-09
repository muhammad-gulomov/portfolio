import { describe, it, expect } from 'vitest'
import { eveningVoteMessage, morningDutyMessage, tagMember } from '../src/telegram/copy'

describe('duty copy', () => {
  it('tags username and states kitchen trash duty', () => {
    const tag = tagMember(
      {
        id: 1,
        telegram_user_id: 1,
        display_name: 'Alice',
        username: 'alice',
        sort_order: 0,
        active: 1,
      },
      1,
    )
    expect(tag).toBe('@alice')
    const morning = morningDutyMessage(tag, 'fresh')
    expect(morning).toContain('@alice, it is your turn to remove the trash from the kitchen, nigga.')
    expect(morning).toContain('\n')
  })

  it('evening keeps the same tone and OK instructions', () => {
    const text = eveningVoteMessage('@bob')
    expect(text).toContain('@bob, evening review: did you remove the trash from the kitchen, nigga?')
    expect(text).toContain('press OK')
  })
})
