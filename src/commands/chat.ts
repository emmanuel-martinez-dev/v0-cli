import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'
import { createClient } from 'v0-sdk'
import { ensureApiKey, getConfig } from '../utils/config.js'
import { formatOutput, success, error, info, formatChat } from '../utils/output.js'

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
                process.exit(1)
            }
        })

    // List chats
    chat
        .command('list')
        .description('List all chats')
        .option('-f, --favorite', 'Show only favorite chats')
        .option('-l, --limit <number>', 'Number of chats to show', '10')
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

                const chats = response.data.map(chat => ({
                    id: chat.id,
                    name: chat.name || 'Untitled',
                    privacy: chat.privacy,
                    created: new Date(chat.createdAt).toLocaleDateString(),
                    url: chat.webUrl
                }))

                formatOutput(chats, outputFormat)

            } catch (err) {
                error(`Failed to list chats: ${err instanceof Error ? err.message : 'Unknown error'}`)
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
                process.exit(1)
            }
        })

    // Send message to chat
    chat
        .command('message')
        .description('Send a message to a chat')
        .argument('<chatId>', 'Chat ID')
        .argument('[message]', 'Message to send')
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
                    message: chatMessage
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
                process.exit(1)
            }
        })
} 