import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Command } from 'commander'
import { projectCommand } from '../commands/project.js'

// Mock config helpers
vi.mock('../utils/config.js', () => ({
    ensureApiKey: vi.fn(async () => 'test-key'),
    getConfig: vi.fn(() => ({ apiKey: 'test-key', defaultProject: 'proj_1', outputFormat: 'json' })),
}))

const projectsMock = {
    create: vi.fn(async (body) => ({ id: 'p1', ...body })),
    update: vi.fn(async (body) => ({ id: body.projectId, ...body })),
    findEnvVars: vi.fn(async () => ({ object: 'list', data: [{ id: 'e1', key: 'K', value: 'V', decrypted: false }] })),
    getEnvVar: vi.fn(async () => ({ object: 'environment_variable', data: { id: 'e1', key: 'K', value: 'V', decrypted: true } })),
    createEnvVars: vi.fn(async (body) => ({ object: 'list', data: body.environmentVariables.map((v: any, i: number) => ({ id: `e${i + 1}`, key: v.key, value: v.value, decrypted: true })) })),
    updateEnvVars: vi.fn(async (body) => ({ object: 'list', data: body.environmentVariables.map((v: any) => ({ id: v.id, key: 'K', value: v.value, decrypted: true })) })),
    deleteEnvVars: vi.fn(async (body) => ({ object: 'list', data: body.environmentVariableIds.map((id: string) => ({ id, object: 'environment_variable', deleted: true })) })),
    assign: vi.fn(async () => ({})),
}

vi.mock('v0-sdk', () => {
    const createClient = vi.fn(() => ({ projects: projectsMock }))
    return { createClient }
})

function makeProgram() {
    const program = new Command()
    projectCommand(program)
    return program
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('project create/update flags and env vars subcommands', () => {
    it('project create forwards extended fields', async () => {
        const program = makeProgram()
        await program.parseAsync(['project', 'create', 'MyProj', '--description', 'D', '--icon', 'I', '--instructions', 'INS', '--privacy', 'private', '--vercel-project-id', 'vprj_1', '--env', 'A=1', 'B=2'], { from: 'user' })
        expect(projectsMock.create).toHaveBeenCalled()
        const body = (projectsMock.create as any).mock.calls[0][0]
        expect(body).toMatchObject({
            name: 'MyProj', description: 'D', icon: 'I', instructions: 'INS', privacy: 'private', vercelProjectId: 'vprj_1',
        })
        expect(body.environmentVariables).toEqual([{ key: 'A', value: '1' }, { key: 'B', value: '2' }])
    })

    it('project update supports privacy and other fields', async () => {
        const program = makeProgram()
        await program.parseAsync(['project', 'update', 'p1', '--name', 'N', '--description', 'D', '--instructions', 'INS', '--privacy', 'team'], { from: 'user' })
        expect(projectsMock.update).toHaveBeenCalledWith({ projectId: 'p1', name: 'N', description: 'D', instructions: 'INS', privacy: 'team' })
    })

    it('env list/get/create/update/delete call SDK with expected shapes', async () => {
        const program = makeProgram()
        await program.parseAsync(['project', 'env', 'list', 'p1', '--decrypted'], { from: 'user' })
        expect(projectsMock.findEnvVars).toHaveBeenCalledWith({ projectId: 'p1', decrypted: 'true' })

        await program.parseAsync(['project', 'env', 'get', 'p1', 'e1', '--decrypted'], { from: 'user' })
        expect(projectsMock.getEnvVar).toHaveBeenCalledWith({ projectId: 'p1', environmentVariableId: 'e1', decrypted: 'true' })

        await program.parseAsync(['project', 'env', 'create', 'p1', '--var', 'A=1', 'B=2', '--upsert', '--decrypted'], { from: 'user' })
        expect(projectsMock.createEnvVars).toHaveBeenCalledWith({ projectId: 'p1', decrypted: 'true', environmentVariables: [{ key: 'A', value: '1' }, { key: 'B', value: '2' }], upsert: true })

        await program.parseAsync(['project', 'env', 'update', 'p1', '--var', 'e1=V1', 'e2=V2', '--decrypted'], { from: 'user' })
        expect(projectsMock.updateEnvVars).toHaveBeenCalledWith({ projectId: 'p1', decrypted: 'true', environmentVariables: [{ id: 'e1', value: 'V1' }, { id: 'e2', value: 'V2' }] })

        await program.parseAsync(['project', 'env', 'delete', 'p1', '--id', 'e1', 'e2'], { from: 'user' })
        expect(projectsMock.deleteEnvVars).toHaveBeenCalledWith({ projectId: 'p1', environmentVariableIds: ['e1', 'e2'] })
    })
})


