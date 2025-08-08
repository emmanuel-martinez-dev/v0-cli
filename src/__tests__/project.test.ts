import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatProject } from '../utils/output.js'

describe('Project formatting', () => {
    const consoleLog = console.log
    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => { })
    })
    it('prints essential fields', () => {
        formatProject({ id: 'p1', name: 'My Project', createdAt: Date.now(), webUrl: 'https://example.com' })
        expect(console.log).toHaveBeenCalled()
    })
    afterEach(() => {
        ; (console.log as any).mockRestore?.()
        console.log = consoleLog
    })
})


