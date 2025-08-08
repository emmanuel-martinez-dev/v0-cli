import chalk from 'chalk'
import { CliConfig } from './config.js'
import YAML from 'yaml'

export function formatOutput(data: any, format: 'json' | 'table' | 'yaml' = 'table'): void {
    switch (format) {
        case 'json':
            console.log(JSON.stringify(data, null, 2))
            break
        case 'yaml':
            try {
                const yamlString = YAML.stringify(data)
                console.log(yamlString)
            } catch (err) {
                console.log(JSON.stringify(data, null, 2))
            }
            break
        case 'table':
        default:
            formatTable(data)
            break
    }
}

function formatTable(data: any): void {
    const maxColumnWidth = 40
    const truncate = (value: string, limit = maxColumnWidth): string => {
        if (value.length <= limit) return value
        return value.slice(0, limit - 1) + '…'
    }

    const stringifyValue = (val: unknown): string => {
        if (val === null || val === undefined) return ''
        if (typeof val === 'string') return val
        if (typeof val === 'number' || typeof val === 'boolean') return String(val)
        if (val instanceof Date) return val.toISOString()
        try {
            return JSON.stringify(val)
        } catch {
            return String(val)
        }
    }

    if (Array.isArray(data)) {
        if (data.length === 0) {
            console.log(chalk.gray('No items found'))
            return
        }

        // If array of primitives, print as list
        if (typeof data[0] !== 'object' || data[0] === null) {
            data.forEach((item, idx) => {
                console.log(`${idx + 1}. ${truncate(stringifyValue(item), 120)}`)
            })
            return
        }

        // Array of objects: collect all headers
        const headersSet = new Set<string>()
        data.forEach((item) => {
            Object.keys(item).forEach((k) => headersSet.add(k))
        })
        const headers = Array.from(headersSet)

        // Compute column widths
        const widths = headers.map((h) => Math.min(maxColumnWidth, Math.max(h.length, ...data.map((row) => truncate(stringifyValue((row as any)[h])).length))))

        // Print header
        const headerRow = headers
            .map((h, i) => h.padEnd(widths[i]))
            .join(' | ')
        console.log(chalk.blue(headerRow))
        console.log(chalk.gray('-'.repeat(headerRow.length)))

        // Rows
        for (const row of data) {
            const cols = headers.map((h, i) => truncate(stringifyValue((row as any)[h])).padEnd(widths[i]))
            console.log(cols.join(' | '))
        }
    } else if (typeof data === 'object' && data !== null) {
        // Single object: key: value
        Object.entries(data).forEach(([key, value]) => {
            console.log(`${chalk.blue(key)}: ${stringifyValue(value)}`)
        })
    } else {
        console.log(stringifyValue(data))
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

export function printSdkError(err: unknown, verbose: boolean = false): void {
    const unknownMsg = 'Unknown error'
    if (!err) {
        if (verbose) console.error(chalk.gray('[no error object]'))
        return
    }
    // Try to extract common fields
    const anyErr = err as any
    const status = anyErr?.status || anyErr?.response?.status
    const body = anyErr?.response?.data || anyErr?.body || anyErr?.error || anyErr?.data
    const code = anyErr?.code || anyErr?.error?.type
    const detail = anyErr?.message || anyErr?.error?.message || unknownMsg

    const parts: string[] = []
    if (status) parts.push(`status=${status}`)
    if (code) parts.push(`code=${code}`)
    if (detail) parts.push(`message=${detail}`)
    if (parts.length > 0) {
        console.error(chalk.gray('Details:'), parts.join(' | '))
    }
    if (verbose && body) {
        try {
            console.error(chalk.gray('Body:'), typeof body === 'string' ? body : JSON.stringify(body, null, 2))
        } catch {
            console.error(chalk.gray('Body:'), String(body))
        }
    }
    if (verbose && anyErr?.stack) {
        console.error(chalk.gray(anyErr.stack))
    }
}