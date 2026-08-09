import { describe, it, expect, beforeEach } from 'vitest'
import {
  clearBotIdentityCache,
  greetText,
  messageMentionsBot,
  userHandle,
} from '../src/telegram/greet'

describe('mention greeting', () => {
  beforeEach(() => clearBotIdentityCache())

  it('formats greeting with username and commands after a blank line', () => {
    const text = greetText({ id: 1, username: 'bob', first_name: 'Bob' })
    expect(text.startsWith('wassup nigga, @bob\n\n')).toBe(true)
    expect(text).toContain('/list')
    expect(text).toContain('/add')
    expect(text).not.toContain('/start')
    expect(text).not.toContain('/join')
    expect(text).not.toContain('/leave')
  })

  it('falls back to display name without username', () => {
    expect(userHandle({ id: 2, first_name: 'Alice' })).toBe('Alice')
    expect(greetText({ id: 2, first_name: 'Alice' }).startsWith('wassup nigga, Alice\n\n')).toBe(true)
  })

  it('detects @bot mention entity', () => {
    const text = 'hey @CleanBot what up'
    const mentioned = messageMentionsBot(
      {
        message_id: 1,
        chat: { id: -1, type: 'supergroup' },
        text,
        entities: [{ type: 'mention', offset: 4, length: 9 }],
      },
      { id: 99, username: 'CleanBot' },
    )
    expect(mentioned).toBe(true)
  })

  it('ignores other @mentions', () => {
    const text = 'hey @alice'
    const mentioned = messageMentionsBot(
      {
        message_id: 1,
        chat: { id: -1, type: 'supergroup' },
        text,
        entities: [{ type: 'mention', offset: 4, length: 6 }],
      },
      { id: 99, username: 'CleanBot' },
    )
    expect(mentioned).toBe(false)
  })
})
