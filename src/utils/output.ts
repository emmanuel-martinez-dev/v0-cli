import chalk from 'chalk'
import { CliConfig } from './config.js'

export function formatOutput(data: any, format: 'json' | 'table' | 'yaml' = 'table'): void {
    switch (format) {
        case 'json':
            console.log(JSON.stringify(data, null, 2))
            break
        case 'yaml':
            console.log(JSON.stringify(data, null, 2)) // Simplified YAML for now
            break
        case 'table':
        default:
            formatTable(data)
            break
    }
}

function formatTable(data: any): void {
    if (Array.isArray(data)) {
        if (data.length === 0) {
            console.log(chalk.gray('No items found'))
            return
        }

        // Simple table formatting
        const headers = Object.keys(data[0])
        const table = [headers, ...data.map(item => headers.map(header => item[header]))]

        console.log(chalk.blue(headers.join(' | ')))
        console.log(chalk.gray('-'.repeat(headers.join(' | ').length)))

        for (let i = 1; i < table.length; i++) {
            console.log(table[i].join(' | '))
        }
    } else {
        // Single object
        Object.entries(data).forEach(([key, value]) => {
            console.log(`${chalk.blue(key)}: ${value}`)
        })
    }
}

export function success(message: string): void {
    console.log(chalk.green('✓'), message)
}

export function error(message: string): void {
    console.error(chalk.red('✗'), message)
}

export function info(message: string): void {
    console.log(chalk.blue('ℹ'), message)
}

export function warning(message: string): void {
    console.log(chalk.yellow('⚠'), message)
}

export function formatChat(chat: any): void {
    console.log(chalk.blue('Chat Details:'))
    console.log(`ID: ${chat.id}`)
    console.log(`Name: ${chat.name || 'Untitled'}`)
    console.log(`Privacy: ${chat.privacy}`)
    console.log(`Created: ${new Date(chat.createdAt).toLocaleString()}`)
    console.log(`URL: ${chat.webUrl}`)

    if (chat.latestVersion?.demoUrl) {
        console.log(`Demo: ${chat.latestVersion.demoUrl}`)
    }
}

export function formatProject(project: any): void {
    console.log(chalk.blue('Project Details:'))
    console.log(`ID: ${project.id}`)
    console.log(`Name: ${project.name}`)
    console.log(`Description: ${project.description || 'No description'}`)
    console.log(`Created: ${new Date(project.createdAt).toLocaleString()}`)
    console.log(`URL: ${project.webUrl}`)

    if (project.vercelProjectId) {
        console.log(`Vercel Project ID: ${project.vercelProjectId}`)
    }
}

export function formatUser(user: any): void {
    console.log(chalk.blue('User Details:'))
    console.log(`ID: ${user.id}`)
    console.log(`Name: ${user.name || 'No name'}`)
    console.log(`Email: ${user.email}`)
    console.log(`Avatar: ${user.avatar}`)
} 