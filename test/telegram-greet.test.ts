import { describe, it, expect, beforeEach } from 'vitest'
import {
  clearBotIdentityCache,
  greetText,
  messageMentionsBot,
  userHandle,
} from '../src/telegram/greet'

describe('mention greeting', () => {
  beforeEach(() => clearBotIdentityCache())

  it('formats greeting with username', () => {
    expect(greetText({ id: 1, username: 'bob', first_name: 'Bob' })).toBe('wassup nigga, @bob')
  })

  it('falls back to display name without username', () => {
    expect(userHandle({ id: 2, first_name: 'Alice' })).toBe('Alice')
    expect(greetText({ id: 2, first_name: 'Alice' })).toBe('wassup nigga, Alice')
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
