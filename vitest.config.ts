import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./src/__tests__/setup.ts'],
        // Coverage is executed via CLI flag only to avoid provider issues across environments
    }
}) 