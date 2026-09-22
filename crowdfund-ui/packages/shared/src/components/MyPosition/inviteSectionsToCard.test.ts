// ABOUTME: Tests for sending an on-chain invite through live invite sections.
// ABOUTME: Success is reported only when the section confirms the invite was sent.

import { describe, it, expect, vi } from 'vitest'
import {
  inviteOnchainViaSections,
  type InviteSectionLike,
} from './inviteSectionsToCard'

const ADDRESS = '0x1111111111111111111111111111111111111111'

function makeSection(
  overrides: Partial<InviteSectionLike['config']> = {},
  hop: 0 | 1 | 2 = 0,
): InviteSectionLike {
  return {
    hop,
    totalSlots: 3,
    config: {
      slots: [
        { id: 1, status: 'redeemed' },
        { id: 2, status: 'empty' },
        { id: 3, status: 'empty' },
      ],
      onGenerateLink: vi.fn().mockResolvedValue(undefined),
      onRevoke: vi.fn(),
      onInviteOnchain: vi.fn().mockResolvedValue(true),
      ...overrides,
    },
  }
}

describe('inviteOnchainViaSections', () => {
  it('sends through the first empty slot and returns the created invite once confirmed', async () => {
    const section = makeSection()
    const created = await inviteOnchainViaSections([section], 1, ADDRESS, 'friend.eth')
    expect(section.config.onInviteOnchain).toHaveBeenCalledWith(2, ADDRESS, 'friend.eth')
    expect(created).toEqual({ id: 2, address: ADDRESS, ensName: 'friend.eth' })
  })

  it('returns undefined when the section reports the invite was not sent', async () => {
    const section = makeSection({ onInviteOnchain: vi.fn().mockResolvedValue(false) })
    const created = await inviteOnchainViaSections([section], 1, ADDRESS)
    expect(section.config.onInviteOnchain).toHaveBeenCalledOnce()
    expect(created).toBeUndefined()
  })

  it('prompts a network switch instead of sending on the wrong network', async () => {
    const onSwitchNetwork = vi.fn()
    const section = makeSection({ isWrongNetwork: true, onSwitchNetwork })
    const created = await inviteOnchainViaSections([section], 1, ADDRESS)
    expect(onSwitchNetwork).toHaveBeenCalledOnce()
    expect(section.config.onInviteOnchain).not.toHaveBeenCalled()
    expect(created).toBeUndefined()
  })

  it('routes a Hop-2 invitee through the Hop-1 section', async () => {
    const hop0 = makeSection({}, 0)
    const hop1 = makeSection({}, 1)
    await inviteOnchainViaSections([hop0, hop1], 2, ADDRESS)
    expect(hop0.config.onInviteOnchain).not.toHaveBeenCalled()
    expect(hop1.config.onInviteOnchain).toHaveBeenCalledOnce()
  })

  it('returns undefined without sending when no slot is empty', async () => {
    const section = makeSection({ slots: [{ id: 1, status: 'redeemed' }] })
    const created = await inviteOnchainViaSections([section], 1, ADDRESS)
    expect(section.config.onInviteOnchain).not.toHaveBeenCalled()
    expect(created).toBeUndefined()
  })
})
