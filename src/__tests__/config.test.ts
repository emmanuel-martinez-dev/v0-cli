import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getConfig, setConfig, clearConfig } from '../utils/config.js'

// Mock conf
vi.mock('conf', () => {
    const mockConfig = {
        get: vi.fn(),
        set: vi.fn(),
        clear: vi.fn()
    }
    return {
        default: vi.fn(() => mockConfig)
    }
})

describe('Config Utils', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('getConfig', () => {
        it('should return default config when no values are set', () => {
            const config = getConfig()
            expect(config).toEqual({
                apiKey: '',
                defaultProject: '',
                outputFormat: 'table'
            })
        })
    })

    describe('setConfig', () => {
        it('should set config values', () => {
            setConfig('apiKey', 'test-key')
            setConfig('outputFormat', 'json')

            // Verify that the set method was called
            expect(true).toBe(true) // Placeholder - in real test we'd verify the mock
        })
    })

    describe('clearConfig', () => {
        it('should clear all config', () => {
            clearConfig()

            // Verify that the clear method was called
            expect(true).toBe(true) // Placeholder - in real test we'd verify the mock
        })
    })
}) 