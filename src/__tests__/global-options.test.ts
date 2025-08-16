import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Command } from 'commander'
import { chatCommand } from '../commands/chat.js'
import { projectCommand } from '../commands/project.js'

vi.mock('../utils/config.js', () => ({
    ensureApiKey: vi.fn(async () => 'test-key'),
    getConfig: vi.fn(() => ({ apiKey: 'test-key', defaultProject: '', baseUrl: '', outputFormat: 'json' })),
    resolveBaseUrl: vi.fn((preferred?: string) => preferred || process.env.V0_BASE_URL || ''),
}))

const hoisted = vi.hoisted(() => {
    const chatsMock = {
        find: vi.fn(async () => ({ object: 'list', data: [] })),
    }
    const projectsMock = {
        find: vi.fn(async () => ({ object: 'list', data: [] })),
    }
    const createClientSpy = vi.fn(() => ({ chats: chatsMock, projects: projectsMock }))
    return { chatsMock, projectsMock, createClientSpy }
})
const { createClientSpy } = hoisted as unknown as { createClientSpy: any }
vi.mock('v0-sdk', () => ({ createClient: (hoisted as any).createClientSpy }))

beforeEach(() => {
    vi.clearAllMocks()
})

afterEach(() => {
    delete process.env.V0_BASE_URL
})

describe('global baseUrl option', () => {
    it('passes --base-url to createClient in chat command', async () => {
        const program = new Command()
        program.option('--base-url <url>')
        chatCommand(program)
        await program.parseAsync(['chat', 'list', '--limit', '1', '--base-url', 'https://example.com'], { from: 'user' })
        expect(createClientSpy).toHaveBeenCalled()
        const cfg = (createClientSpy as any).mock.calls[0][0]
        expect(cfg).toMatchObject({ baseUrl: 'https://example.com' })
    })

    it('reads baseUrl from env V0_BASE_URL when flag not provided (project command)', async () => {
        process.env.V0_BASE_URL = 'https://env-base-url'
        const program = new Command()
        projectCommand(program)
        await program.parseAsync(['project', 'list'], { from: 'user' })
        expect(createClientSpy).toHaveBeenCalled()
        const cfg = (createClientSpy as any).mock.calls[0][0]
        expect(cfg).toMatchObject({ baseUrl: 'https://env-base-url' })
    })
})


