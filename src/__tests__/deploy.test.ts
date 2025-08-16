import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Command } from 'commander'
import { deployCommand } from '../commands/deploy.js'

vi.mock('../utils/config.js', () => ({
    ensureApiKey: vi.fn(async () => 'test-key'),
    getConfig: vi.fn(() => ({ apiKey: 'test-key', defaultProject: 'proj_1', outputFormat: 'json' })),
}))

const deploymentsMock = {
    find: vi.fn(async () => ({ object: 'list', data: [{ id: 'd1', object: 'deployment', inspectorUrl: '', chatId: 'chat_1', projectId: 'proj_1', versionId: 'v1', apiUrl: '', webUrl: '' }] })),
    create: vi.fn(async (body) => ({ id: 'd2', object: 'deployment', inspectorUrl: 'https://inspector', chatId: body.chatId, projectId: body.projectId, versionId: body.versionId, apiUrl: '', webUrl: 'https://web' })),
    getById: vi.fn(async () => ({ id: 'd1', object: 'deployment', inspectorUrl: '', chatId: 'chat_1', projectId: 'proj_1', versionId: 'v1', apiUrl: '', webUrl: '' })),
    delete: vi.fn(async () => ({ id: 'd1', object: 'deployment', deleted: true })),
    findLogs: vi.fn(async () => ({ logs: ['log1', 'log2'], nextSince: 123 })),
    findErrors: vi.fn(async () => ({ error: 'boom', errorType: 'TypeError', formattedError: 'Boom', fullErrorText: 'stack...' })),
}

const projectsMock = {
    find: vi.fn(async () => ({ object: 'list', data: [{ id: 'proj_1', object: 'project', name: 'P1', privacy: 'private', apiUrl: '', webUrl: '', createdAt: new Date().toISOString() }] })),
    getById: vi.fn(async () => ({ id: 'proj_1', object: 'project', name: 'P1', privacy: 'private', apiUrl: '', webUrl: '', createdAt: new Date().toISOString(), chats: [], vercelProjectId: 'ver_1' })),
    create: vi.fn(async ({ name }: any) => ({ id: 'proj_X', name, createdAt: Date.now(), webUrl: '' })),
}

const chatsMock = {
    find: vi.fn(async () => ({ object: 'list', data: [{ id: 'chat_1', object: 'chat', shareable: true, privacy: 'private', favorite: false, authorId: 'u1', createdAt: new Date().toISOString(), apiUrl: '', webUrl: '' }] })),
    getById: vi.fn(async () => ({ id: 'chat_1', object: 'chat', shareable: true, privacy: 'private', favorite: false, authorId: 'u1', createdAt: new Date().toISOString(), apiUrl: '', webUrl: '', text: '', latestVersion: { id: 'v1', object: 'version', status: 'completed', createdAt: new Date().toISOString(), files: [] } })),
    create: vi.fn(async () => ({ id: 'chat_X', webUrl: 'https://chat', latestVersion: { id: 'vX' } })),
}

vi.mock('v0-sdk', () => {
    const createClient = vi.fn(() => ({ deployments: deploymentsMock, projects: projectsMock, chats: chatsMock }))
    return { createClient }
})

function makeProgram() {
    const program = new Command()
    deployCommand(program)
    return program
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('deploy commands', () => {
    it('list calls deployments.find with provided ids', async () => {
        const program = makeProgram()
        await program.parseAsync(['deploy', 'list', '--project-id', 'proj_1', '--chat-id', 'chat_1', '--version-id', 'v1', '-o', 'json'], { from: 'user' })
        expect(deploymentsMock.find).toHaveBeenCalledWith({ projectId: 'proj_1', chatId: 'chat_1', versionId: 'v1' })
    })

    it('create calls deployments.create with provided ids', async () => {
        const program = makeProgram()
        await program.parseAsync(['deploy', 'create', 'proj_1', 'chat_1', 'v1', '-o', 'json'], { from: 'user' })
        expect(deploymentsMock.create).toHaveBeenCalledWith({ projectId: 'proj_1', chatId: 'chat_1', versionId: 'v1' })
    })

    it('from-chat uses latest version and provided project id', async () => {
        const program = makeProgram()
        await program.parseAsync(['deploy', 'from-chat', 'chat_1', '--project-id', 'proj_1', '-o', 'json'], { from: 'user' })
        expect(deploymentsMock.create).toHaveBeenCalledWith({ projectId: 'proj_1', chatId: 'chat_1', versionId: 'v1' })
    })

    it('quick creates project, chat and deployment', async () => {
        const program = makeProgram()
        await program.parseAsync(['deploy', 'quick', 'Hola mundo', '--project-name', 'My Project', '-o', 'json'], { from: 'user' })
        expect(projectsMock.create).toHaveBeenCalled()
        expect(chatsMock.create).toHaveBeenCalled()
        // The command uses the chat details to get latestVersion; ensure deployments.create was called
        expect(deploymentsMock.create).toHaveBeenCalled()
    })

    it('get calls deployments.getById', async () => {
        const program = makeProgram()
        await program.parseAsync(['deploy', 'get', 'd1', '-o', 'json'], { from: 'user' })
        expect(deploymentsMock.getById).toHaveBeenCalledWith({ deploymentId: 'd1' })
    })

    it('delete calls deployments.delete', async () => {
        const program = makeProgram()
        await program.parseAsync(['deploy', 'delete', 'd1', '--force'], { from: 'user' })
        expect(deploymentsMock.delete).toHaveBeenCalledWith({ deploymentId: 'd1' })
    })

    it('logs calls deployments.findLogs with since when provided', async () => {
        const program = makeProgram()
        await program.parseAsync(['deploy', 'logs', 'd1', '--since', '100', '-o', 'json'], { from: 'user' })
        expect(deploymentsMock.findLogs).toHaveBeenCalledWith({ deploymentId: 'd1', since: '100' })
    })

    it('errors calls deployments.findErrors', async () => {
        const program = makeProgram()
        await program.parseAsync(['deploy', 'errors', 'd1', '-o', 'json'], { from: 'user' })
        expect(deploymentsMock.findErrors).toHaveBeenCalledWith({ deploymentId: 'd1' })
    })
})


