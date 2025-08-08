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

                const project = await v0.projects.create({
                    name: projectName,
                    description: options.description,
                    icon: options.icon
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
        .option('--vercel-project-id <vercelProjectId>', 'Link to a Vercel project ID')
        .action(async (projectId, options) => {
            try {
                const apiKey = await ensureApiKey()
                const v0 = createClient({ apiKey })

                const updateData: any = {}
                if (options.name) updateData.name = options.name
                if (options.description) updateData.description = options.description
                if (options.instructions) updateData.instructions = options.instructions
                if (options.vercelProjectId) updateData.vercelProjectId = options.vercelProjectId

                if (Object.keys(updateData).length === 0) {
                    error('No update data provided. Use --name, --description, or --instructions')
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
} 