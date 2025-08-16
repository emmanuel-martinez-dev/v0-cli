import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'
import { readFileSync } from 'fs'
import { basename } from 'path'
import { createClient } from 'v0-sdk'
import { ensureApiKey, getConfig } from '../utils/config.js'
import { formatOutput, success, error, info, formatChat, printSdkError } from '../utils/output.js'

export function chatCommand(program: Command): void {
    const chat = program
        .command('chat')
        .description('Manage v0 chats')

    // Create chat
    chat
        .command('create')
        .description('Create a new chat')
        .argument('[message]', 'Initial message')
        .option('-s, --system <system>', 'System message')
        .option('-p, --privacy <privacy>', 'Privacy setting (public|private)', 'private')
        .option('-m, --model <model>', 'Model to use', 'v0-1.5-md')
        .option('-o, --output <format>', 'Output format (json|table|yaml)')
        .option('-P, --project-id <projectId>', 'Project ID to associate')
        .option('-a, --attachment <url...>', 'Attachment URL(s)')
        .action(async (message, options) => {
            try {
                const globalOpts = (program.opts && program.opts()) || {}
                const apiKey = await ensureApiKey(globalOpts.apiKey)
                const v0 = createClient({ apiKey })
                const config = getConfig()
                const outputFormat = (options.output || globalOpts.output || config.outputFormat) as 'json' | 'table' | 'yaml'

                let chatMessage = message
                if (!chatMessage) {
                    const answers = await inquirer.prompt([
                        {
                            type: 'input',
                            name: 'message',
                            message: 'Enter your message:',
                            validate: (input: string) => {
                                if (!input || input.trim().length === 0) {
                                    return 'Message is required'
                                }
                                return true
                            }
                        }
                    ])
                    chatMessage = answers.message
                }

                const spinner = ora('Creating chat...').start()

                const chat = await v0.chats.create({
                    message: chatMessage,
                    system: options.system,
                    chatPrivacy: options.privacy as any,
                    projectId: options.projectId || config.defaultProject || undefined,
                    modelConfiguration: {
                        modelId: options.model as any
                    },
                    attachments: Array.isArray(options.attachment)
                        ? options.attachment.map((url: string) => ({ url }))
                        : undefined,
                })

                spinner.succeed('Chat created successfully!')

                if (outputFormat === 'table') {
                    formatChat(chat)
                } else {
                    formatOutput(chat, outputFormat)
                }

                success(`Chat URL: ${chat.webUrl}`)

            } catch (err) {
                error(`Failed to create chat: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    // List chats
    chat
        .command('list')
        .description('List all chats')
        .option('-f, --favorite', 'Show only favorite chats')
        .option('-l, --limit <number>', 'Number of chats to show', '10')
        .option('-P, --project-id <id>', 'Filter by project ID')
        .option('-n, --name <text>', 'Filter by name containing text')
        .option('-p, --privacy <privacy>', 'Filter by privacy (public|private)')
        .option('-o, --output <format>', 'Output format (json|table|yaml)')
        .action(async (options) => {
            try {
                const globalOpts = (program.opts && program.opts()) || {}
                const apiKey = await ensureApiKey(globalOpts.apiKey)
                const v0 = createClient({ apiKey })
                const config = getConfig()
                const outputFormat = (options.output || globalOpts.output || config.outputFormat) as 'json' | 'table' | 'yaml'

                const spinner = ora('Fetching chats...').start()

                const response = await v0.chats.find({
                    limit: options.limit,
                    isFavorite: options.favorite ? 'true' : undefined
                })

                spinner.succeed(`Found ${response.data.length} chats`)

                if (response.data.length === 0) {
                    info('No chats found')
                    return
                }

                // Client-side filters for convenience
                const filtered = response.data.filter(chat => {
                    if (options.projectId && chat.projectId !== options.projectId) return false
                    if (options.privacy && chat.privacy !== options.privacy) return false
                    if (options.name && !(chat.name || '').toLowerCase().includes(options.name.toLowerCase())) return false
                    return true
                })

                const chats = filtered.map(chat => ({
                    id: chat.id,
                    name: chat.name || 'Untitled',
                    privacy: chat.privacy,
                    created: new Date(chat.createdAt).toLocaleDateString(),
                    url: chat.webUrl
                }))

                formatOutput(chats, outputFormat)

                // If API returns pagination info, surface it
                // @ts-expect-error runtime check only
                if (response.nextCursor) {
                    // @ts-expect-error runtime check only
                    console.log(chalk.gray(`\nNext page cursor: ${response.nextCursor}`))
                }

            } catch (err) {
                error(`Failed to list chats: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    // Get chat details
    chat
        .command('get')
        .description('Get chat details')
        .argument('<chatId>', 'Chat ID')
        .option('-o, --output <format>', 'Output format (json|table|yaml)')
        .action(async (chatId, options) => {
            try {
                const globalOpts = (program.opts && program.opts()) || {}
                const apiKey = await ensureApiKey(globalOpts.apiKey)
                const v0 = createClient({ apiKey })
                const config = getConfig()
                const outputFormat = (options.output || globalOpts.output || config.outputFormat) as 'json' | 'table' | 'yaml'

                const spinner = ora('Fetching chat details...').start()

                const chat = await v0.chats.getById({ chatId })

                spinner.succeed('Chat details retrieved')

                if (outputFormat === 'table') {
                    formatChat(chat)
                } else {
                    formatOutput(chat, outputFormat)
                }

            } catch (err) {
                error(`Failed to get chat: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    // Update chat (rename, privacy)
    chat
        .command('update')
        .description('Update chat details')
        .argument('<chatId>', 'Chat ID')
        .option('-n, --name <name>', 'New chat name')
        .option('-p, --privacy <privacy>', 'Privacy (public|private)')
        .option('-o, --output <format>', 'Output format (json|table|yaml)')
        .action(async (chatId, options) => {
            try {
                const globalOpts = (program.opts && program.opts()) || {}
                const apiKey = await ensureApiKey(globalOpts.apiKey)
                const v0 = createClient({ apiKey })
                const config = getConfig()
                const outputFormat = (options.output || globalOpts.output || config.outputFormat) as 'json' | 'table' | 'yaml'

                const updateData: any = {}
                if (options.name) updateData.name = options.name
                if (options.privacy) updateData.privacy = options.privacy

                if (Object.keys(updateData).length === 0) {
                    error('No update fields provided. Use --name and/or --privacy')
                    process.exit(1)
                }

                const spinner = ora('Updating chat...').start()
                const chat = await v0.chats.update({ chatId, ...updateData })
                spinner.succeed('Chat updated successfully!')

                if (outputFormat === 'table') {
                    formatChat(chat)
                } else {
                    formatOutput(chat, outputFormat)
                }
            } catch (err) {
                error(`Failed to update chat: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    // Archive/Unarchive not available in current SDK

    // Initialize a chat from sources (files, repo, registry, zip)
    chat
        .command('init')
        .description('Initialize a chat from sources (files, repo, registry, or zip)')
        .option('-n, --name <name>', 'Chat name')
        .option('-p, --privacy <privacy>', 'Privacy (public|private|team|team-edit|unlisted)')
        .option('-P, --project-id <projectId>', 'Project ID to associate')
        .option('--lock-all-files', 'Lock all files when applicable')
        .option('--file <path...>', 'Add local file(s) to initialize the chat (reads content)')
        .option('--repo-url <url>', 'Initialize from a Git repo URL')
        .option('--repo-branch <branch>', 'Git repo branch')
        .option('--registry-url <url>', 'Initialize from a registry URL')
        .option('--zip-url <url>', 'Initialize from a zip URL')
        .option('-o, --output <format>', 'Output format (json|table|yaml)')
        .action(async (options) => {
            try {
                const globalOpts = (program.opts && program.opts()) || {}
                const apiKey = await ensureApiKey(globalOpts.apiKey)
                const v0 = createClient({ apiKey })
                const config = getConfig()
                const outputFormat = (options.output || globalOpts.output || config.outputFormat) as 'json' | 'table' | 'yaml'

                // Determine init type based on provided options
                let initPayload: any | null = null
                if (options.file && options.file.length > 0) {
                    const files = (options.file as string[]).map((p) => ({
                        name: basename(p),
                        content: readFileSync(p, 'utf8'),
                    }))
                    initPayload = {
                        type: 'files',
                        files,
                        lockAllFiles: !!options.lockAllFiles,
                    }
                } else if (options.repoUrl) {
                    initPayload = {
                        type: 'repo',
                        repo: {
                            url: options.repoUrl as string,
                            branch: options.repoBranch as string | undefined,
                        },
                        lockAllFiles: !!options.lockAllFiles,
                    }
                } else if (options.registryUrl) {
                    initPayload = {
                        type: 'registry',
                        registry: { url: options.registryUrl as string },
                        lockAllFiles: !!options.lockAllFiles,
                    }
                } else if (options.zipUrl) {
                    initPayload = {
                        type: 'zip',
                        zip: { url: options.zipUrl as string },
                        lockAllFiles: !!options.lockAllFiles,
                    }
                }

                if (!initPayload) {
                    error('Provide at least one source: --file, --repo-url, --registry-url, or --zip-url')
                    process.exit(1)
                }

                const spinner = ora('Initializing chat...').start()
                const chat = await v0.chats.init({
                    ...initPayload,
                    name: options.name,
                    chatPrivacy: options.privacy,
                    projectId: options.projectId || config.defaultProject || undefined,
                })
                spinner.succeed('Chat initialized successfully!')

                if (outputFormat === 'table') {
                    formatChat(chat)
                } else {
                    formatOutput(chat, outputFormat)
                }
            } catch (err) {
                error(`Failed to initialize chat: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    // Fork a chat
    chat
        .command('fork')
        .description('Fork a chat (optionally from a specific version)')
        .argument('<chatId>', 'Chat ID')
        .option('-v, --version-id <versionId>', 'Version ID to fork from')
        .option('-o, --output <format>', 'Output format (json|table|yaml)')
        .action(async (chatId, options) => {
            try {
                const globalOpts = (program.opts && program.opts()) || {}
                const apiKey = await ensureApiKey(globalOpts.apiKey)
                const v0 = createClient({ apiKey })
                const config = getConfig()
                const outputFormat = (options.output || globalOpts.output || config.outputFormat) as 'json' | 'table' | 'yaml'

                const spinner = ora('Forking chat...').start()
                const chat = await v0.chats.fork({ chatId, versionId: options.versionId })
                spinner.succeed('Chat forked successfully!')

                if (outputFormat === 'table') {
                    formatChat(chat)
                } else {
                    formatOutput(chat, outputFormat)
                }
            } catch (err) {
                error(`Failed to fork chat: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    // Messages subcommands
    const messages = chat
        .command('messages')
        .description('Manage chat messages')

    messages
        .command('list')
        .description('List messages in a chat')
        .argument('<chatId>', 'Chat ID')
        .option('-l, --limit <number>', 'Number of messages to show', '20')
        .option('-c, --cursor <cursor>', 'Pagination cursor')
        .option('-o, --output <format>', 'Output format (json|table|yaml)')
        .action(async (chatId, options) => {
            try {
                const globalOpts = (program.opts && program.opts()) || {}
                const apiKey = await ensureApiKey(globalOpts.apiKey)
                const v0 = createClient({ apiKey })
                const config = getConfig()
                const outputFormat = (options.output || globalOpts.output || config.outputFormat) as 'json' | 'table' | 'yaml'

                const spinner = ora('Fetching messages...').start()
                const resp = await v0.chats.findMessages({ chatId, limit: options.limit, cursor: options.cursor })
                spinner.succeed(`Found ${resp.data.length} messages`)

                if (outputFormat === 'table') {
                    const rows = resp.data.map((m) => ({
                        id: m.id,
                        role: m.role,
                        type: m.type,
                        createdAt: new Date(m.createdAt).toLocaleString(),
                        content: m.content?.slice(0, 80) || '',
                    }))
                    formatOutput(rows, 'table')
                    if (resp.pagination?.nextCursor) {
                        console.log(chalk.gray(`\nNext page cursor: ${resp.pagination.nextCursor}`))
                    }
                } else {
                    formatOutput(resp, outputFormat)
                }
            } catch (err) {
                error(`Failed to list messages: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    messages
        .command('get')
        .description('Get a specific message')
        .argument('<chatId>', 'Chat ID')
        .argument('<messageId>', 'Message ID')
        .option('-o, --output <format>', 'Output format (json|table|yaml)')
        .action(async (chatId, messageId, options) => {
            try {
                const globalOpts = (program.opts && program.opts()) || {}
                const apiKey = await ensureApiKey(globalOpts.apiKey)
                const v0 = createClient({ apiKey })
                const config = getConfig()
                const outputFormat = (options.output || globalOpts.output || config.outputFormat) as 'json' | 'table' | 'yaml'

                const spinner = ora('Fetching message...').start()
                const msg = await v0.chats.getMessage({ chatId, messageId })
                spinner.succeed('Message retrieved')

                formatOutput(msg, outputFormat)
            } catch (err) {
                error(`Failed to get message: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    // Versions subcommands
    const versions = chat
        .command('versions')
        .description('Manage chat versions')

    versions
        .command('list')
        .description('List versions of a chat')
        .argument('<chatId>', 'Chat ID')
        .option('-l, --limit <number>', 'Number of versions to show', '20')
        .option('-c, --cursor <cursor>', 'Pagination cursor')
        .option('-o, --output <format>', 'Output format (json|table|yaml)')
        .action(async (chatId, options) => {
            try {
                const globalOpts = (program.opts && program.opts()) || {}
                const apiKey = await ensureApiKey(globalOpts.apiKey)
                const v0 = createClient({ apiKey })
                const config = getConfig()
                const outputFormat = (options.output || globalOpts.output || config.outputFormat) as 'json' | 'table' | 'yaml'

                const spinner = ora('Fetching versions...').start()
                const resp = await v0.chats.findVersions({ chatId, limit: options.limit, cursor: options.cursor })
                spinner.succeed(`Found ${resp.data.length} versions`)

                if (outputFormat === 'table') {
                    const rows = resp.data.map((v) => ({
                        id: v.id,
                        status: v.status,
                        createdAt: new Date(v.createdAt).toLocaleString(),
                        demoUrl: (v as any).demoUrl || '',
                    }))
                    formatOutput(rows, 'table')
                    if (resp.pagination?.nextCursor) {
                        console.log(chalk.gray(`\nNext page cursor: ${resp.pagination.nextCursor}`))
                    }
                } else {
                    formatOutput(resp, outputFormat)
                }
            } catch (err) {
                error(`Failed to list versions: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    versions
        .command('get')
        .description('Get a specific version')
        .argument('<chatId>', 'Chat ID')
        .argument('<versionId>', 'Version ID')
        .option('-o, --output <format>', 'Output format (json|table|yaml)')
        .action(async (chatId, versionId, options) => {
            try {
                const globalOpts = (program.opts && program.opts()) || {}
                const apiKey = await ensureApiKey(globalOpts.apiKey)
                const v0 = createClient({ apiKey })
                const config = getConfig()
                const outputFormat = (options.output || globalOpts.output || config.outputFormat) as 'json' | 'table' | 'yaml'

                const spinner = ora('Fetching version...').start()
                const version = await v0.chats.getVersion({ chatId, versionId })
                spinner.succeed('Version retrieved')

                formatOutput(version, outputFormat)
            } catch (err) {
                error(`Failed to get version: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    versions
        .command('update')
        .description('Update files in a specific version')
        .argument('<chatId>', 'Chat ID')
        .argument('<versionId>', 'Version ID')
        .option('--file <path...>', 'Local file paths to include (reads content)')
        .option('-o, --output <format>', 'Output format (json|table|yaml)')
        .action(async (chatId, versionId, options) => {
            try {
                const globalOpts = (program.opts && program.opts()) || {}
                const apiKey = await ensureApiKey(globalOpts.apiKey)
                const v0 = createClient({ apiKey })
                const config = getConfig()
                const outputFormat = (options.output || globalOpts.output || config.outputFormat) as 'json' | 'table' | 'yaml'

                if (!options.file || options.file.length === 0) {
                    error('Provide at least one --file path to update the version')
                    process.exit(1)
                }

                const files = (options.file as string[]).map((p) => ({
                    name: basename(p),
                    content: readFileSync(p, 'utf8'),
                }))

                const spinner = ora('Updating version files...').start()
                const updated = await v0.chats.updateVersion({ chatId, versionId, files })
                spinner.succeed('Version updated successfully!')

                formatOutput(updated, outputFormat)
            } catch (err) {
                error(`Failed to update version: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    // Resume a message (continue generation)
    chat
        .command('resume')
        .description('Resume a chat generation after a specific message')
        .argument('<chatId>', 'Chat ID')
        .argument('<messageId>', 'Message ID')
        .option('-o, --output <format>', 'Output format (json|table|yaml)')
        .action(async (chatId, messageId, options) => {
            try {
                const globalOpts = (program.opts && program.opts()) || {}
                const apiKey = await ensureApiKey(globalOpts.apiKey)
                const v0 = createClient({ apiKey })
                const config = getConfig()
                const outputFormat = (options.output || globalOpts.output || config.outputFormat) as 'json' | 'table' | 'yaml'

                const spinner = ora('Resuming generation...').start()
                const resumed = await v0.chats.resume({ chatId, messageId })
                spinner.succeed('Generation resumed')

                formatOutput(resumed, outputFormat)
            } catch (err) {
                error(`Failed to resume: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    // Send message to chat
    chat
        .command('message')
        .description('Send a message to a chat')
        .argument('<chatId>', 'Chat ID')
        .argument('[message]', 'Message to send')
        .option('-a, --attachment <url...>', 'Attachment URL(s)')
        .option('-m, --model <model>', 'Model to use')
        .option('--response-mode <mode>', 'Response mode (sync|async)')
        .option('-o, --output <format>', 'Output format (json|table|yaml)')
        .action(async (chatId, message, options) => {
            try {
                const globalOpts = (program.opts && program.opts()) || {}
                const apiKey = await ensureApiKey(globalOpts.apiKey)
                const v0 = createClient({ apiKey })
                const config = getConfig()
                const outputFormat = (options.output || globalOpts.output || config.outputFormat) as 'json' | 'table' | 'yaml'

                let chatMessage = message
                if (!chatMessage) {
                    const answers = await inquirer.prompt([
                        {
                            type: 'input',
                            name: 'message',
                            message: 'Enter your message:',
                            validate: (input: string) => {
                                if (!input || input.trim().length === 0) {
                                    return 'Message is required'
                                }
                                return true
                            }
                        }
                    ])
                    chatMessage = answers.message
                }

                const spinner = ora('Sending message...').start()

                const response = await v0.chats.sendMessage({
                    chatId,
                    message: chatMessage,
                    attachments: Array.isArray(options.attachment)
                        ? options.attachment.map((url: string) => ({ url }))
                        : undefined,
                    modelConfiguration: options.model ? { modelId: options.model as any } : undefined,
                    responseMode: options.responseMode
                })

                spinner.succeed('Message sent successfully!')

                if (outputFormat === 'table') {
                    console.log(chalk.blue('Message sent successfully!'))
                    console.log(`Chat ID: ${chatId}`)
                    console.log(`Message: ${chatMessage}`)
                } else {
                    formatOutput({ chatId, message: chatMessage }, outputFormat)
                }

            } catch (err) {
                error(`Failed to send message: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    // Delete chat
    chat
        .command('delete')
        .description('Delete a chat')
        .argument('<chatId>', 'Chat ID')
        .option('-f, --force', 'Skip confirmation')
        .action(async (chatId, options) => {
            try {
                const apiKey = await ensureApiKey()
                const v0 = createClient({ apiKey })

                if (!options.force) {
                    const answers = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'confirm',
                            message: `Are you sure you want to delete chat ${chatId}?`,
                            default: false
                        }
                    ])

                    if (!answers.confirm) {
                        info('Deletion cancelled')
                        return
                    }
                }

                const spinner = ora('Deleting chat...').start()

                await v0.chats.delete({ chatId })

                spinner.succeed('Chat deleted successfully!')
                success(`Chat ${chatId} has been deleted`)

            } catch (err) {
                error(`Failed to delete chat: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    // Toggle favorite status
    chat
        .command('favorite')
        .description('Toggle favorite status of a chat')
        .argument('<chatId>', 'Chat ID')
        .option('-r, --remove', 'Remove from favorites')
        .action(async (chatId, options) => {
            try {
                const apiKey = await ensureApiKey()
                const v0 = createClient({ apiKey })

                const spinner = ora(options.remove ? 'Removing from favorites...' : 'Adding to favorites...').start()

                await v0.chats.favorite({
                    chatId,
                    isFavorite: !options.remove
                })

                spinner.succeed(options.remove ? 'Removed from favorites' : 'Added to favorites')
                success(`Chat ${chatId} ${options.remove ? 'removed from' : 'added to'} favorites`)

            } catch (err) {
                error(`Failed to update favorite status: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })
} 