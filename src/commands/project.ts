import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'
import { createClient } from 'v0-sdk'
import { ensureApiKey, getConfig } from '../utils/config.js'
import { formatOutput, success, error, info, formatProject, printSdkError } from '../utils/output.js'

export function projectCommand(program: Command): void {
    const project = program
        .command('project')
        .description('Manage v0 projects')

    // Create project
    project
        .command('create')
        .description('Create a new project')
        .argument('[name]', 'Project name')
        .option('-d, --description <description>', 'Project description')
        .option('-i, --icon <icon>', 'Project icon')
        .option('--instructions <instructions>', 'Project instructions')
        .option('--privacy <privacy>', 'Project privacy (private|team)')
        .option('--vercel-project-id <id>', 'Link to a Vercel project ID')
        .option('--env <key=value...>', 'Environment variables to set on create')
        .option('-o, --output <format>', 'Output format (json|table|yaml)', 'table')
        .action(async (name, options) => {
            try {
                const apiKey = await ensureApiKey()
                const v0 = createClient({ apiKey })
                const config = getConfig()

                let projectName = name
                if (!projectName) {
                    const answers = await inquirer.prompt([
                        {
                            type: 'input',
                            name: 'name',
                            message: 'Enter project name:',
                            validate: (input: string) => {
                                if (!input || input.trim().length === 0) {
                                    return 'Project name is required'
                                }
                                return true
                            }
                        }
                    ])
                    projectName = answers.name
                }

                const spinner = ora('Creating project...').start()

                const envVarsInput: string[] | undefined = options.env
                const environmentVariables = Array.isArray(envVarsInput)
                    ? envVarsInput
                        .map((pair) => {
                            const idx = (pair as string).indexOf('=')
                            if (idx === -1) return null
                            const key = (pair as string).slice(0, idx)
                            const value = (pair as string).slice(idx + 1)
                            if (!key) return null
                            return { key, value }
                        })
                        .filter(Boolean) as { key: string; value: string }[]
                    : undefined

                const project = await v0.projects.create({
                    name: projectName,
                    description: options.description,
                    icon: options.icon,
                    instructions: options.instructions,
                    vercelProjectId: options.vercelProjectId,
                    privacy: options.privacy,
                    environmentVariables,
                })

                spinner.succeed('Project created successfully!')

                if (config.outputFormat === 'table') {
                    formatProject(project)
                } else {
                    formatOutput(project, config.outputFormat)
                }

                success(`Project URL: ${project.webUrl}`)

            } catch (err) {
                error(`Failed to create project: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    // List projects
    project
        .command('list')
        .description('List all projects')
        .option('-l, --limit <number>', 'Number of projects to show', '10')
        .option('-o, --output <format>', 'Output format (json|table|yaml)', 'table')
        .action(async (options) => {
            try {
                const apiKey = await ensureApiKey()
                const v0 = createClient({ apiKey })
                const config = getConfig()

                const spinner = ora('Fetching projects...').start()

                const response = await v0.projects.find()

                spinner.succeed(`Found ${response.data.length} projects`)

                if (response.data.length === 0) {
                    info('No projects found')
                    return
                }

                const projects = response.data.map(project => ({
                    id: project.id,
                    name: project.name,
                    description: 'No description', // ProjectSummary doesn't have description
                    created: new Date(project.createdAt).toLocaleDateString(),
                    url: project.webUrl
                }))

                formatOutput(projects, config.outputFormat)

            } catch (err) {
                error(`Failed to list projects: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    // Get project details
    project
        .command('get')
        .description('Get project details')
        .argument('<projectId>', 'Project ID')
        .option('-o, --output <format>', 'Output format (json|table|yaml)', 'table')
        .action(async (projectId, options) => {
            try {
                const apiKey = await ensureApiKey()
                const v0 = createClient({ apiKey })
                const config = getConfig()

                const spinner = ora('Fetching project details...').start()

                const project = await v0.projects.getById({ projectId })

                spinner.succeed('Project details retrieved')

                if (config.outputFormat === 'table') {
                    formatProject(project)

                    if (project.chats && project.chats.length > 0) {
                        console.log(chalk.blue('\nChats in this project:'))
                        project.chats.forEach(chat => {
                            console.log(`  - ${chat.name || 'Untitled'} (${chat.id})`)
                        })
                    }
                } else {
                    formatOutput(project, config.outputFormat)
                }

            } catch (err) {
                error(`Failed to get project: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    // Update project
    project
        .command('update')
        .description('Update project details')
        .argument('<projectId>', 'Project ID')
        .option('-n, --name <name>', 'New project name')
        .option('-d, --description <description>', 'New project description')
        .option('-i, --instructions <instructions>', 'New project instructions')
        .option('--privacy <privacy>', 'Project privacy (private|team)')
        .action(async (projectId, options) => {
            try {
                const apiKey = await ensureApiKey()
                const v0 = createClient({ apiKey })

                const updateData: any = {}
                if (options.name) updateData.name = options.name
                if (options.description) updateData.description = options.description
                if (options.instructions) updateData.instructions = options.instructions
                if (options.privacy) updateData.privacy = options.privacy

                if (Object.keys(updateData).length === 0) {
                    error('No update data provided. Use --name, --description, --instructions, or --privacy')
                    process.exit(1)
                }

                const spinner = ora('Updating project...').start()

                const project = await v0.projects.update({
                    projectId,
                    ...updateData
                })

                spinner.succeed('Project updated successfully!')
                formatProject(project)

            } catch (err) {
                error(`Failed to update project: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    // Delete project (not available in current SDK)

    // Assign chat to project
    project
        .command('assign')
        .description('Assign a chat to a project')
        .argument('<projectId>', 'Project ID')
        .argument('<chatId>', 'Chat ID')
        .action(async (projectId, chatId) => {
            try {
                const apiKey = await ensureApiKey()
                const v0 = createClient({ apiKey })

                const spinner = ora('Assigning chat to project...').start()

                await v0.projects.assign({
                    projectId,
                    chatId
                })

                spinner.succeed('Chat assigned to project successfully!')
                success(`Chat ${chatId} assigned to project ${projectId}`)

            } catch (err) {
                error(`Failed to assign chat: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    // Get project by chat ID
    project
        .command('get-by-chat')
        .description('Get project associated with a chat')
        .argument('<chatId>', 'Chat ID')
        .option('-o, --output <format>', 'Output format (json|table|yaml)', 'table')
        .action(async (chatId, options) => {
            try {
                const apiKey = await ensureApiKey()
                const v0 = createClient({ apiKey })
                const config = getConfig()

                const spinner = ora('Fetching project...').start()

                const project = await v0.projects.getByChatId({ chatId })

                spinner.succeed('Project retrieved')

                if (config.outputFormat === 'table') {
                    formatProject(project)
                } else {
                    formatOutput(project, config.outputFormat)
                }

            } catch (err) {
                error(`Failed to get project: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    // Environment variables subcommands
    const env = project
        .command('env')
        .description('Manage project environment variables')

    env
        .command('list')
        .description('List environment variables')
        .argument('<projectId>', 'Project ID')
        .option('--decrypted', 'Return decrypted values when available')
        .option('-o, --output <format>', 'Output format (json|table|yaml)', 'table')
        .action(async (projectId, options) => {
            try {
                const apiKey = await ensureApiKey()
                const v0 = createClient({ apiKey })
                const config = getConfig()

                const spinner = ora('Fetching environment variables...').start()
                const res = await v0.projects.findEnvVars({ projectId, decrypted: options.decrypted ? 'true' : undefined })
                spinner.succeed(`Found ${res.data.length} environment variables`)

                const rows = res.data.map((v: any) => ({ id: v.id, key: v.key, value: v.value, decrypted: v.decrypted }))
                formatOutput(rows, options.output || config.outputFormat)
            } catch (err) {
                error(`Failed to list env vars: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    env
        .command('get')
        .description('Get a specific environment variable')
        .argument('<projectId>', 'Project ID')
        .argument('<envVarId>', 'Environment Variable ID')
        .option('--decrypted', 'Return decrypted value when available')
        .option('-o, --output <format>', 'Output format (json|table|yaml)', 'table')
        .action(async (projectId, envVarId, options) => {
            try {
                const apiKey = await ensureApiKey()
                const v0 = createClient({ apiKey })
                const config = getConfig()

                const spinner = ora('Fetching environment variable...').start()
                const res = await v0.projects.getEnvVar({ projectId, environmentVariableId: envVarId, decrypted: options.decrypted ? 'true' : undefined })
                spinner.succeed('Environment variable retrieved')

                formatOutput(res, options.output || config.outputFormat)
            } catch (err) {
                error(`Failed to get env var: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    env
        .command('create')
        .description('Create environment variables')
        .argument('<projectId>', 'Project ID')
        .option('--var <key=value...>', 'Key=Value pair(s) to create')
        .option('--upsert', 'Upsert existing keys')
        .option('--decrypted', 'Return decrypted values in response')
        .option('-o, --output <format>', 'Output format (json|table|yaml)', 'table')
        .action(async (projectId, options) => {
            try {
                const apiKey = await ensureApiKey()
                const v0 = createClient({ apiKey })
                const config = getConfig()

                const varsInput: string[] | undefined = options.var
                if (!varsInput || varsInput.length === 0) {
                    error('Provide at least one --var KEY=VALUE')
                    process.exit(1)
                }
                const envs = varsInput
                    .map((pair) => {
                        const idx = (pair as string).indexOf('=')
                        if (idx === -1) return null
                        const key = (pair as string).slice(0, idx)
                        const value = (pair as string).slice(idx + 1)
                        if (!key) return null
                        return { key, value }
                    })
                    .filter(Boolean) as { key: string; value: string }[]

                const spinner = ora('Creating environment variables...').start()
                const res = await v0.projects.createEnvVars({ projectId, decrypted: options.decrypted ? 'true' : undefined, environmentVariables: envs, upsert: !!options.upsert })
                spinner.succeed('Environment variables created')

                formatOutput(res, options.output || config.outputFormat)
            } catch (err) {
                error(`Failed to create env vars: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    env
        .command('update')
        .description('Update environment variables by ID')
        .argument('<projectId>', 'Project ID')
        .option('--var <id=value...>', 'Id=Value pair(s) to update')
        .option('--decrypted', 'Return decrypted values in response')
        .option('-o, --output <format>', 'Output format (json|table|yaml)', 'table')
        .action(async (projectId, options) => {
            try {
                const apiKey = await ensureApiKey()
                const v0 = createClient({ apiKey })
                const config = getConfig()

                const varsInput: string[] | undefined = options.var
                if (!varsInput || varsInput.length === 0) {
                    error('Provide at least one --var ID=VALUE')
                    process.exit(1)
                }
                const envs = varsInput
                    .map((pair) => {
                        const idx = (pair as string).indexOf('=')
                        if (idx === -1) return null
                        const id = (pair as string).slice(0, idx)
                        const value = (pair as string).slice(idx + 1)
                        if (!id) return null
                        return { id, value }
                    })
                    .filter(Boolean) as { id: string; value: string }[]

                const spinner = ora('Updating environment variables...').start()
                const res = await v0.projects.updateEnvVars({ projectId, decrypted: options.decrypted ? 'true' : undefined, environmentVariables: envs })
                spinner.succeed('Environment variables updated')

                formatOutput(res, options.output || config.outputFormat)
            } catch (err) {
                error(`Failed to update env vars: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    env
        .command('delete')
        .description('Delete environment variables by ID')
        .argument('<projectId>', 'Project ID')
        .option('--id <envVarId...>', 'Environment variable ID(s) to delete')
        .option('-o, --output <format>', 'Output format (json|table|yaml)', 'table')
        .action(async (projectId, options) => {
            try {
                const apiKey = await ensureApiKey()
                const v0 = createClient({ apiKey })
                const config = getConfig()

                const ids: string[] | undefined = options.id
                if (!ids || ids.length === 0) {
                    error('Provide at least one --id ENV_VAR_ID')
                    process.exit(1)
                }

                const spinner = ora('Deleting environment variables...').start()
                const res = await v0.projects.deleteEnvVars({ projectId, environmentVariableIds: ids })
                spinner.succeed('Environment variables deleted')

                formatOutput(res, options.output || config.outputFormat)
            } catch (err) {
                error(`Failed to delete env vars: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })
} 