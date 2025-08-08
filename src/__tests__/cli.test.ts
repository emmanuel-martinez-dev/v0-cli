import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn } from 'child_process'
import { join } from 'path'

const CLI = join(__dirname, '../../dist/index.js')

function runCli(args: string[], env: NodeJS.ProcessEnv = {}): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
        const child = spawn(process.execPath, [CLI, ...args], {
            env: { ...process.env, ...env, CI: '1', FORCE_COLOR: '0' },
            stdio: ['ignore', 'pipe', 'pipe'],
        })
        let stdout = ''
        let stderr = ''
        child.stdout.on('data', (d) => (stdout += d.toString()))
        child.stderr.on('data', (d) => (stderr += d.toString()))
        child.on('close', (code) => resolve({ code: code ?? 0, stdout, stderr }))
    })
}

describe('CLI smoke tests', () => {
    beforeAll(async () => {
        // Ensure build exists
    })

    it('shows help', async () => {
        const res = await runCli(['--help'])
        expect(res.code).toBe(0)
        expect(res.stdout).toContain('CLI tool for v0 Platform API')
        expect(res.stdout).toContain('chat')
        expect(res.stdout).toContain('project')
    })

    it('shows version', async () => {
        const res = await runCli(['--version'])
        expect(res.code).toBe(0)
        expect(res.stdout.trim()).toMatch(/\d+\.\d+\.\d+/)
    })

    // Note: networked commands are not tested here to keep tests hermetic.
})


