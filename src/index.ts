#!/usr/bin/env node

import { Command } from 'commander'
import chalk from 'chalk'
import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { chatCommand } from './commands/chat.js'
import { projectCommand } from './commands/project.js'
import { deployCommand } from './commands/deploy.js'
import { userCommand } from './commands/user.js'
import { configCommand } from './commands/config.js'

// Read package.json
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'))

const program = new Command()

program
    .name('v0')
    .description('CLI tool for v0 Platform API')
    .version(packageJson.version, '-V, --version')
    .option('-k, --api-key <key>', 'API key for v0')
    .option('-v, --verbose', 'Enable verbose logging')

// Add commands
chatCommand(program)
projectCommand(program)
deployCommand(program)
userCommand(program)
configCommand(program)

// Global error handler
program.exitOverride()

try {
    await program.parseAsync()
} catch (error) {
    // Check if it's a help command error (which is expected)
    if (error instanceof Error && error.message.includes('outputHelp')) {
        // This is expected when showing help, so we don't treat it as an error
        process.exit(0)
    }

    // Check if it's a version command (which is expected)
    if (error instanceof Error && (error.message.includes('outputVersion') || error.message.includes('1.1.0'))) {
        // This is expected when showing version, so we don't treat it as an error
        process.exit(0)
    }

    // Handle other errors
    if (error instanceof Error) {
        console.error(chalk.red('Error:'), error.message)
    } else {
        console.error(chalk.red('Unknown error occurred'))
    }
    process.exit(1)
} 