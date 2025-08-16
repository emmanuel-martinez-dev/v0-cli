import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'
import { createClient } from 'v0-sdk'
import { ensureApiKey, getConfig } from '../utils/config.js'
import { formatOutput, success, error, info, printSdkError } from '../utils/output.js'

type HookEvent =
    | 'chat.created'
    | 'chat.updated'
    | 'chat.deleted'
    | 'message.created'
    | 'message.updated'
    | 'message.deleted'
    | 'project.created'
    | 'project.updated'
    | 'project.deleted'

const ALL_EVENTS: HookEvent[] = [
    'chat.created',
    'chat.updated',
    'chat.deleted',
    'message.created',
    'message.updated',
    'message.deleted',
    'project.created',
    'project.updated',
    'project.deleted',
]

export function hooksCommand(program: Command): void {
    const hook = program
        .command('hook')
        .description('Manage webhooks')

    // List hooks
    hook
        .command('list')
        .description('List hooks')
        .option('-o, --output <format>', 'Output format (json|table|yaml)')
        .action(async (options) => {
            try {
                const globalOpts = (program.opts && program.opts()) || {}
                const apiKey = await ensureApiKey(globalOpts.apiKey)
                const v0 = createClient({ apiKey })
                const config = getConfig()
                const outputFormat = (options.output || globalOpts.output || config.outputFormat) as 'json' | 'table' | 'yaml'

                const spinner = ora('Fetching hooks...').start()
                const res = await v0.hooks.find()
                spinner.succeed(`Found ${res.data.length} hooks`)

                if (outputFormat === 'table') {
                    const rows = res.data.map((h: any) => ({ id: h.id, name: h.name }))
                    formatOutput(rows, 'table')
                } else {
                    formatOutput(res, outputFormat)
                }
            } catch (err) {
                error(`Failed to list hooks: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    // Create hook
    hook
        .command('create')
        .description('Create a new hook')
        .option('-n, --name <name>', 'Hook name')
        .option('-e, --event <event...>', 'Event(s) to subscribe to')
        .option('--chat-id <chatId>', 'Chat ID scope')
        .option('--project-id <projectId>', 'Project ID scope')
        .option('-u, --url <url>', 'Webhook URL')
        .option('-o, --output <format>', 'Output format (json|table|yaml)')
        .action(async (options) => {
            try {
                const globalOpts = (program.opts && program.opts()) || {}
                const apiKey = await ensureApiKey(globalOpts.apiKey)
                const v0 = createClient({ apiKey })
                const config = getConfig()
                const outputFormat = (options.output || globalOpts.output || config.outputFormat) as 'json' | 'table' | 'yaml'

                let name: string | undefined = options.name
                let url: string | undefined = options.url
                let events: HookEvent[] | undefined = options.event as HookEvent[] | undefined

                if (!name || !url || !events || events.length === 0) {
                    const answers = await inquirer.prompt([
                        !name && {
                            type: 'input',
                            name: 'name',
                            message: 'Hook name:',
                            validate: (v: string) => (v ? true : 'Name is required'),
                        },
                        !url && {
                            type: 'input',
                            name: 'url',
                            message: 'Webhook URL:',
                            validate: (v: string) => (v ? true : 'URL is required'),
                        },
                        (!events || events.length === 0) && {
                            type: 'checkbox',
                            name: 'events',
                            message: 'Select events:',
                            choices: ALL_EVENTS.map((e) => ({ name: e, value: e })),
                            validate: (arr: string[]) => (arr && arr.length > 0 ? true : 'Select at least one event'),
                        },
                    ].filter(Boolean) as any)
                    name = name || answers.name
                    url = url || answers.url
                    events = (events && events.length > 0 ? events : answers.events) as HookEvent[]
                }

                const spinner = ora('Creating hook...').start()
                const created = await v0.hooks.create({
                    name: name!,
                    url: url!,
                    events: events!,
                    chatId: options.chatId,
                    projectId: options.projectId,
                })
                spinner.succeed('Hook created successfully!')

                if (outputFormat === 'table') {
                    formatOutput(created, 'table')
                } else {
                    formatOutput(created, outputFormat)
                }
                success(`Hook ${created.id} created`)
            } catch (err) {
                error(`Failed to create hook: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    // Get hook by id
    hook
        .command('get')
        .description('Get hook details')
        .argument('<hookId>', 'Hook ID')
        .option('-o, --output <format>', 'Output format (json|table|yaml)')
        .action(async (hookId, options) => {
            try {
                const globalOpts = (program.opts && program.opts()) || {}
                const apiKey = await ensureApiKey(globalOpts.apiKey)
                const v0 = createClient({ apiKey })
                const config = getConfig()
                const outputFormat = (options.output || globalOpts.output || config.outputFormat) as 'json' | 'table' | 'yaml'

                const spinner = ora('Fetching hook...').start()
                const hook = await v0.hooks.getById({ hookId })
                spinner.succeed('Hook retrieved')

                formatOutput(hook, outputFormat)
            } catch (err) {
                error(`Failed to get hook: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    // Update hook
    hook
        .command('update')
        .description('Update hook')
        .argument('<hookId>', 'Hook ID')
        .option('-n, --name <name>', 'Hook name')
        .option('-e, --event <event...>', 'Event(s) to subscribe to')
        .option('-u, --url <url>', 'Webhook URL')
        .option('-o, --output <format>', 'Output format (json|table|yaml)')
        .action(async (hookId, options) => {
            try {
                const globalOpts = (program.opts && program.opts()) || {}
                const apiKey = await ensureApiKey(globalOpts.apiKey)
                const v0 = createClient({ apiKey })
                const config = getConfig()
                const outputFormat = (options.output || globalOpts.output || config.outputFormat) as 'json' | 'table' | 'yaml'

                const updateData: any = {}
                if (options.name) updateData.name = options.name
                if (options.url) updateData.url = options.url
                if (options.event && options.event.length > 0) updateData.events = options.event

                if (Object.keys(updateData).length === 0) {
                    error('No update fields provided. Use --name, --event, or --url')
                    process.exit(1)
                }

                const spinner = ora('Updating hook...').start()
                const updated = await v0.hooks.update({ hookId, ...updateData })
                spinner.succeed('Hook updated successfully!')

                formatOutput(updated, outputFormat)
            } catch (err) {
                error(`Failed to update hook: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    // Delete hook
    hook
        .command('delete')
        .description('Delete hook')
        .argument('<hookId>', 'Hook ID')
        .option('-f, --force', 'Skip confirmation')
        .action(async (hookId, options) => {
            try {
                const globalOpts = (program.opts && program.opts()) || {}
                const apiKey = await ensureApiKey(globalOpts.apiKey)
                const v0 = createClient({ apiKey })

                if (!options.force) {
                    const ans = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'confirm',
                            message: `Delete hook ${hookId}?`,
                            default: false,
                        },
                    ])
                    if (!ans.confirm) {
                        info('Deletion cancelled')
                        return
                    }
                }

                const spinner = ora('Deleting hook...').start()
                await v0.hooks.delete({ hookId })
                spinner.succeed('Hook deleted successfully!')
                success(`Hook ${hookId} deleted`)
            } catch (err) {
                error(`Failed to delete hook: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })
}


