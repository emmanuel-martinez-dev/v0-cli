import { describe, it, expect, vi, beforeEach } from 'vitest'
import { formatOutput, success, error, info, warning } from '../utils/output.js'

// Mock console.log and console.error
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => { })
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => { })

describe('Output Utils', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('formatOutput', () => {
        it('should format table output for array data', () => {
            const data = [
                { id: '1', name: 'Test 1' },
                { id: '2', name: 'Test 2' }
            ]

            formatOutput(data, 'table')

            expect(mockConsoleLog).toHaveBeenCalled()
        })

        it('should format JSON output', () => {
            const data = { id: '1', name: 'Test' }

            formatOutput(data, 'json')

            expect(mockConsoleLog).toHaveBeenCalledWith(JSON.stringify(data, null, 2))
        })

        it('should format table output for single object', () => {
            const data = { id: '1', name: 'Test' }

            formatOutput(data, 'table')

            expect(mockConsoleLog).toHaveBeenCalled()
        })
    })

    describe('success', () => {
        it('should log success message', () => {
            success('Operation completed')

            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓'), 'Operation completed')
        })
    })

    describe('error', () => {
        it('should log error message', () => {
            error('Something went wrong')

            expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('✗'), 'Something went wrong')
        })
    })

    describe('info', () => {
        it('should log info message', () => {
            info('Information message')

            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('ℹ'), 'Information message')
        })
    })

    describe('warning', () => {
        it('should log warning message', () => {
            warning('Warning message')

            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('⚠'), 'Warning message')
        })
    })
}) 