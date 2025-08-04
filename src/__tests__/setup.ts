// Setup file for tests
import { vi } from 'vitest'

// Mock chalk to avoid color codes in tests
vi.mock('chalk', () => ({
    default: {
        blue: vi.fn((text: string) => text),
        green: vi.fn((text: string) => text),
        red: vi.fn((text: string) => text),
        yellow: vi.fn((text: string) => text),
        gray: vi.fn((text: string) => text)
    }
}))

// Mock ora to avoid spinners in tests
vi.mock('ora', () => ({
    default: vi.fn(() => ({
        start: vi.fn(() => ({
            succeed: vi.fn(),
            fail: vi.fn()
        })),
        succeed: vi.fn(),
        fail: vi.fn()
    }))
}))

// Mock inquirer to avoid interactive prompts in tests
vi.mock('inquirer', () => ({
    default: {
        prompt: vi.fn()
    }
})) 