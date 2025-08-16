import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Command } from 'commander'
import { hooksCommand } from '../commands/hooks.js'

vi.mock('../utils/config.js', () => ({
    ensureApiKey: vi.fn(async () => 'test-key'),
    getConfig: vi.fn(() => ({ apiKey: 'test-key', defaultProject: 'proj_1', outputFormat: 'json' })),
}))

const hooksMock = {
    find: vi.fn(async () => ({ object: 'list', data: [{ id: 'h1', name: 'Hook 1' }] })),
    create: vi.fn(async (body) => ({ id: 'h2', ...body })),
    getById: vi.fn(async () => ({ id: 'h1', name: 'Hook 1' })),
    update: vi.fn(async (body) => ({ id: body.hookId, ...body })),
    delete: vi.fn(async () => ({ id: 'h1', object: 'hook', deleted: true })),
}

vi.mock('v0-sdk', () => {
    const createClient = vi.fn(() => ({ hooks: hooksMock }))
    return { createClient }
})

function makeProgram() {
    const program = new Command()
    hooksCommand(program)
    return program
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('hook commands', () => {
    it('list calls hooks.find', async () => {
        const program = makeProgram()
        await program.parseAsync(['hook', 'list'], { from: 'user' })
        expect(hooksMock.find).toHaveBeenCalled()
    })

    it('create passes required fields', async () => {
        const program = makeProgram()
        await program.parseAsync(['hook', 'create', '-n', 'H', '-u', 'https://example.com', '-e', 'chat.created', 'project.updated', '--project-id', 'p1'], { from: 'user' })
        expect(hooksMock.create).toHaveBeenCalled()
        const body = (hooksMock.create as any).mock.calls[0][0]
        expect(body).toMatchObject({ name: 'H', url: 'https://example.com', projectId: 'p1' })
        expect(body.events).toEqual(['chat.created', 'project.updated'])
    })

    it('get calls hooks.getById', async () => {
        const program = makeProgram()
        await program.parseAsync(['hook', 'get', 'h1'], { from: 'user' })
        expect(hooksMock.getById).toHaveBeenCalledWith({ hookId: 'h1' })
    })

    it('update calls hooks.update', async () => {
        const program = makeProgram()
        await program.parseAsync(['hook', 'update', 'h1', '--name', 'New', '--url', 'https://x', '--event', 'chat.deleted'], { from: 'user' })
        expect(hooksMock.update).toHaveBeenCalledWith({ hookId: 'h1', name: 'New', url: 'https://x', events: ['chat.deleted'] })
    })

    it('delete calls hooks.delete', async () => {
        const program = makeProgram()
        await program.parseAsync(['hook', 'delete', 'h1', '--force'], { from: 'user' })
        expect(hooksMock.delete).toHaveBeenCalledWith({ hookId: 'h1' })
    })
})


