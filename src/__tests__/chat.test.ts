import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Command } from 'commander'
import { chatCommand } from '../commands/chat.js'

// Mock config helpers
vi.mock('../utils/config.js', () => ({
    ensureApiKey: vi.fn(async () => 'test-key'),
    getConfig: vi.fn(() => ({ apiKey: 'test-key', defaultProject: 'proj_1', outputFormat: 'json' })),
}))

// Mock fs for file-based commands
vi.mock('fs', async (orig) => {
    const actual: any = await (orig as any)()
    return {
        ...actual,
        readFileSync: vi.fn((p: string) => `content-of-${p}`),
    }
})

// v0-sdk mock with capture of last client instance
const chatsMock = {
    init: vi.fn(async () => ({ id: 'chat_1', webUrl: 'https://v0.dev/c/chat_1' })),
    fork: vi.fn(async () => ({ id: 'chat_2', webUrl: 'https://v0.dev/c/chat_2' })),
    findMessages: vi.fn(async () => ({
        object: 'list', data: [
            { id: 'm1', object: 'message', content: 'hi', createdAt: new Date().toISOString(), type: 'message', role: 'user', apiUrl: '' },
        ], pagination: { hasMore: false }
    })),
    getMessage: vi.fn(async () => ({ id: 'm1', object: 'message', content: 'hi', createdAt: new Date().toISOString(), type: 'message', role: 'user', apiUrl: '', chatId: 'chat_1' })),
    findVersions: vi.fn(async () => ({
        object: 'list', data: [
            { id: 'v1', object: 'version', status: 'completed', createdAt: new Date().toISOString() },
        ], pagination: { hasMore: false }
    })),
    getVersion: vi.fn(async () => ({ id: 'v1', object: 'version', status: 'completed', createdAt: new Date().toISOString(), files: [] })),
    updateVersion: vi.fn(async () => ({ id: 'v1', object: 'version', status: 'completed', createdAt: new Date().toISOString(), files: [] })),
    sendMessage: vi.fn(async () => ({ id: 'chat_1', webUrl: 'https://v0.dev/c/chat_1' })),
    resume: vi.fn(async () => ({ id: 'm2', object: 'message', content: 'resumed', createdAt: new Date().toISOString(), type: 'message', role: 'assistant', apiUrl: '', chatId: 'chat_1' })),
    update: vi.fn(async () => ({ id: 'chat_1', privacy: 'public' })),
}

vi.mock('v0-sdk', () => {
    const createClient = vi.fn(() => ({ chats: chatsMock }))
    return { createClient }
})

function makeProgram() {
    const program = new Command()
    chatCommand(program)
    return program
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('chat subcommands parity', () => {
    it('chat update uses privacy (not chatPrivacy)', async () => {
        const program = makeProgram()
        await program.parseAsync(['chat', 'update', 'chat_1', '--privacy', 'public'], { from: 'user' })
        expect(chatsMock.update).toHaveBeenCalledWith({ chatId: 'chat_1', privacy: 'public' })
    })

    it('chat message forwards attachments, model and responseMode', async () => {
        const program = makeProgram()
        await program.parseAsync(['chat', 'message', 'chat_1', 'Hello', '-a', 'https://a', 'https://b', '-m', 'v0-1.5-md', '--response-mode', 'async'], { from: 'user' })
        expect(chatsMock.sendMessage).toHaveBeenCalled()
        const call = (chatsMock.sendMessage as any).mock.calls[0][0]
        expect(call).toMatchObject({
            chatId: 'chat_1',
            message: 'Hello',
            attachments: [{ url: 'https://a' }, { url: 'https://b' }],
            modelConfiguration: { modelId: 'v0-1.5-md' },
            responseMode: 'async',
        })
    })

    it('chat init from files reads content and calls SDK', async () => {
        const program = makeProgram()
        await program.parseAsync(['chat', 'init', '--file', 'a.ts', 'b.ts', '--name', 'X', '-P', 'proj_1'], { from: 'user' })
        expect(chatsMock.init).toHaveBeenCalled()
        const body = (chatsMock.init as any).mock.calls[0][0]
        expect(body.type).toBe('files')
        expect(body.files).toHaveLength(2)
        expect(body.files[0]).toHaveProperty('content')
    })

    it('chat fork calls SDK with versionId when provided', async () => {
        const program = makeProgram()
        await program.parseAsync(['chat', 'fork', 'chat_1', '--version-id', 'v1'], { from: 'user' })
        expect(chatsMock.fork).toHaveBeenCalledWith({ chatId: 'chat_1', versionId: 'v1' })
    })

    it('chat messages list/get invoke SDK', async () => {
        const program = makeProgram()
        await program.parseAsync(['chat', 'messages', 'list', 'chat_1', '--limit', '5', '--cursor', 'c1'], { from: 'user' })
        expect(chatsMock.findMessages).toHaveBeenCalledWith({ chatId: 'chat_1', limit: '5', cursor: 'c1' })

        await program.parseAsync(['chat', 'messages', 'get', 'chat_1', 'm1'], { from: 'user' })
        expect(chatsMock.getMessage).toHaveBeenCalledWith({ chatId: 'chat_1', messageId: 'm1' })
    })

    it('chat versions list/get/update invoke SDK', async () => {
        const program = makeProgram()
        await program.parseAsync(['chat', 'versions', 'list', 'chat_1', '--limit', '5', '--cursor', 'c1'], { from: 'user' })
        expect(chatsMock.findVersions).toHaveBeenCalledWith({ chatId: 'chat_1', limit: '5', cursor: 'c1' })

        await program.parseAsync(['chat', 'versions', 'get', 'chat_1', 'v1'], { from: 'user' })
        expect(chatsMock.getVersion).toHaveBeenCalledWith({ chatId: 'chat_1', versionId: 'v1' })

        await program.parseAsync(['chat', 'versions', 'update', 'chat_1', 'v1', '--file', 'x.ts', 'y.ts'], { from: 'user' })
        expect(chatsMock.updateVersion).toHaveBeenCalled()
        const upd = (chatsMock.updateVersion as any).mock.calls[0][0]
        expect(upd).toMatchObject({ chatId: 'chat_1', versionId: 'v1' })
        expect(upd.files).toHaveLength(2)
    })

    it('chat resume invokes SDK', async () => {
        const program = makeProgram()
        await program.parseAsync(['chat', 'resume', 'chat_1', 'm1'], { from: 'user' })
        expect(chatsMock.resume).toHaveBeenCalledWith({ chatId: 'chat_1', messageId: 'm1' })
    })
})


