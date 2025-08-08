import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'
import { createClient } from 'v0-sdk'
import { ensureApiKey, getConfig } from '../utils/config.js'
import { formatOutput, error, info, success, printSdkError } from '../utils/output.js'

export function vercelCommand(program: Command): void {
    const vercel = program
        .command('vercel')
        .description('Manage Vercel integrations')

    // List Vercel projects
    vercel
        .command('projects')
        .description('List Vercel projects')
        .option('-o, --output <format>', 'Output format (json|table|yaml)')
        .action(async (options) => {
            try {
                const globalOpts = (program.opts && program.opts()) || {}
                const apiKey = await ensureApiKey(globalOpts.apiKey)
                const v0 = createClient({ apiKey })
                const config = getConfig()
                const outputFormat = (options.output || globalOpts.output || config.outputFormat) as 'json' | 'table' | 'yaml'

                const spinner = ora('Fetching Vercel projects...').start()
                const response = await v0.integrations.vercel.projects.find()
                spinner.succeed(`Found ${response.data.length} Vercel projects`)

                if (response.data.length === 0) {
                    info('No Vercel projects found')
                    return
                }

                const rows = response.data.map((p) => ({
                    id: p.id,
                    name: p.name,
                }))

                formatOutput(rows, outputFormat)
            } catch (err) {
                error(`Failed to list Vercel projects: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    // Create a v0 integration project from a Vercel project (if supported)
    vercel
        .command('create')
        .description('Create a v0 integration from a Vercel project')
        .requiredOption('-v, --vercel-project-id <id>', 'Vercel project ID')
        .requiredOption('-n, --name <name>', 'Name for the v0 project')
        .option('-o, --output <format>', 'Output format (json|table|yaml)')
        .action(async (options) => {
            try {
                const globalOpts = (program.opts && program.opts()) || {}
                const apiKey = await ensureApiKey(globalOpts.apiKey)
                const v0 = createClient({ apiKey })
                const config = getConfig()
                const outputFormat = (options.output || globalOpts.output || config.outputFormat) as 'json' | 'table' | 'yaml'

                const spinner = ora('Creating v0 integration project...').start()
                const integration = await v0.integrations.vercel.projects.create({
                    projectId: options.vercelProjectId,
                    name: options.name,
                })
                spinner.succeed('Integration project created')

                formatOutput(integration, outputFormat)
            } catch (err) {
                error(`Failed to create integration project: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })
}


