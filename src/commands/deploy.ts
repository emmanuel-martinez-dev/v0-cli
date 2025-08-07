import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'
import { createClient } from 'v0-sdk'
import { ensureApiKey, getConfig } from '../utils/config.js'
import { formatOutput, success, error, info } from '../utils/output.js'

export function deployCommand(program: Command): void {
    const deploy = program
        .command('deploy')
        .description('Manage v0 deployments')

    // List deployments
    deploy
        .command('list')
        .description('List deployments')
        .option('-p, --project-id <id>', 'Filter by project ID')
        .option('-c, --chat-id <id>', 'Filter by chat ID')
        .option('-v, --version-id <id>', 'Filter by version ID')
        .option('-o, --output <format>', 'Output format (json|table|yaml)', 'table')
        .action(async (options) => {
            try {
                const apiKey = await ensureApiKey()
                const v0 = createClient({ apiKey })
                const config = getConfig()

                const spinner = ora('Fetching deployments...').start()

                const response = await v0.deployments.find({
                    projectId: options.projectId,
                    chatId: options.chatId,
                    versionId: options.versionId
                })

                spinner.succeed(`Found ${response.data.length} deployments`)

                if (response.data.length === 0) {
                    info('No deployments found')
                    return
                }

                const deployments = response.data.map(deployment => ({
                    id: deployment.id,
                    projectId: deployment.projectId,
                    chatId: deployment.chatId,
                    versionId: deployment.versionId,
                    inspectorUrl: deployment.inspectorUrl,
                    webUrl: deployment.webUrl
                }))

                formatOutput(deployments, config.outputFormat)

            } catch (err) {
                error(`Failed to list deployments: ${err instanceof Error ? err.message : 'Unknown error'}`)
                process.exit(1)
            }
        })

    // Create deployment - Improved version
    deploy
        .command('create')
        .description('Create a new deployment')
        .argument('[projectId]', 'Project ID (optional - will prompt if not provided)')
        .argument('[chatId]', 'Chat ID (optional - will prompt if not provided)')
        .argument('[versionId]', 'Version ID (optional - will prompt if not provided)')
        .option('-i, --interactive', 'Force interactive mode')
        .option('-p, --project-name <name>', 'Select project by name')
        .option('-c, --chat-name <name>', 'Select chat by name')
        .option('-o, --output <format>', 'Output format (json|table|yaml)', 'table')
        .action(async (projectId, chatId, versionId, options) => {
            try {
                const apiKey = await ensureApiKey()
                const v0 = createClient({ apiKey })
                const config = getConfig()

                let finalProjectId = projectId
                let finalChatId = chatId
                let finalVersionId = versionId

                // If any ID is missing or interactive mode is forced, go interactive
                if (!finalProjectId || !finalChatId || !finalVersionId || options.interactive) {
                    const spinner = ora('Loading available resources...').start()

                    // Get projects
                    const projectsResponse = await v0.projects.find()
                    const projects = projectsResponse.data

                    // Get chats
                    const chatsResponse = await v0.chats.find({ limit: '50' })
                    const chats = chatsResponse.data

                    spinner.succeed('Resources loaded')

                    // Interactive project selection
                    if (!finalProjectId) {
                        if (options.projectName) {
                            const project = projects.find(p => p.name.toLowerCase().includes(options.projectName.toLowerCase()))
                            if (project) {
                                finalProjectId = project.id
                                info(`Selected project: ${project.name} (${project.id})`)
                            } else {
                                error(`Project with name containing "${options.projectName}" not found`)
                                process.exit(1)
                            }
                        } else {
                            const projectChoices = projects.map(project => ({
                                name: `${project.name} (${project.id})`,
                                value: project.id
                            }))

                            if (projectChoices.length === 0) {
                                error('No projects found. Please create a project first.')
                                process.exit(1)
                            }

                            const projectAnswer = await inquirer.prompt([
                                {
                                    type: 'list',
                                    name: 'projectId',
                                    message: 'Select a project:',
                                    choices: projectChoices
                                }
                            ])
                            finalProjectId = projectAnswer.projectId
                        }
                    }

                    // Interactive chat selection
                    if (!finalChatId) {
                        if (options.chatName) {
                            const chat = chats.find(c => c.name?.toLowerCase().includes(options.chatName.toLowerCase()))
                            if (chat) {
                                finalChatId = chat.id
                                info(`Selected chat: ${chat.name || 'Unnamed'} (${chat.id})`)
                            } else {
                                error(`Chat with name containing "${options.chatName}" not found`)
                                process.exit(1)
                            }
                        } else {
                            // Filter chats by project if project is selected
                            const relevantChats = finalProjectId
                                ? chats.filter(chat => chat.projectId === finalProjectId)
                                : chats

                            const chatChoices = relevantChats.map(chat => ({
                                name: `${chat.name || 'Unnamed Chat'} (${chat.id}) - ${chat.privacy}`,
                                value: chat.id
                            }))

                            if (chatChoices.length === 0) {
                                error('No chats found for this project. Please create a chat first.')
                                process.exit(1)
                            }

                            const chatAnswer = await inquirer.prompt([
                                {
                                    type: 'list',
                                    name: 'chatId',
                                    message: 'Select a chat:',
                                    choices: chatChoices
                                }
                            ])
                            finalChatId = chatAnswer.chatId
                        }
                    }

                    // Get chat details to find versions
                    if (!finalVersionId) {
                        const chatDetails = await v0.chats.getById({ chatId: finalChatId })

                        if (!chatDetails.latestVersion) {
                            error('No versions found for this chat. Please generate some code first.')
                            process.exit(1)
                        }

                        // For now, we'll use the latest version
                        // In the future, we could show a list of versions if multiple exist
                        finalVersionId = chatDetails.latestVersion.id
                        info(`Using latest version: ${finalVersionId}`)
                    }
                }

                // Validate all IDs are present
                if (!finalProjectId || !finalChatId || !finalVersionId) {
                    error('Missing required IDs. Please provide project, chat, and version IDs.')
                    process.exit(1)
                }

                const spinner = ora('Creating deployment...').start()

                const deployment = await v0.deployments.create({
                    projectId: finalProjectId,
                    chatId: finalChatId,
                    versionId: finalVersionId
                })

                spinner.succeed('Deployment created successfully!')

                if (config.outputFormat === 'table') {
                    console.log(chalk.blue('Deployment Details:'))
                    console.log(`ID: ${deployment.id}`)
                    console.log(`Project ID: ${deployment.projectId}`)
                    console.log(`Chat ID: ${deployment.chatId}`)
                    console.log(`Version ID: ${deployment.versionId}`)
                    console.log(`Inspector URL: ${deployment.inspectorUrl}`)
                    console.log(`Web URL: ${deployment.webUrl}`)
                } else {
                    formatOutput(deployment, config.outputFormat)
                }

                success(`Deployment URL: ${deployment.webUrl}`)
                success(`Inspector URL: ${deployment.inspectorUrl}`)

            } catch (err) {
                error(`Failed to create deployment: ${err instanceof Error ? err.message : 'Unknown error'}`)
                process.exit(1)
            }
        })

    // Quick deploy command - Deploy from chat
    deploy
        .command('from-chat')
        .description('Quick deploy from a chat (uses latest version)')
        .argument('[chatId]', 'Chat ID (optional - will prompt if not provided)')
        .option('-c, --chat-name <name>', 'Select chat by name')
        .option('-p, --project-name <name>', 'Select project by name')
        .option('-o, --output <format>', 'Output format (json|table|yaml)', 'table')
        .action(async (chatId, options) => {
            try {
                const apiKey = await ensureApiKey()
                const v0 = createClient({ apiKey })
                const config = getConfig()

                let finalChatId = chatId

                // Interactive chat selection
                if (!finalChatId) {
                    const spinner = ora('Loading chats...').start()

                    const chatsResponse = await v0.chats.find({ limit: '50' })
                    const chats = chatsResponse.data

                    spinner.succeed('Chats loaded')

                    if (options.chatName) {
                        const chat = chats.find(c => c.name?.toLowerCase().includes(options.chatName.toLowerCase()))
                        if (chat) {
                            finalChatId = chat.id
                            info(`Selected chat: ${chat.name || 'Unnamed'} (${chat.id})`)
                        } else {
                            error(`Chat with name containing "${options.chatName}" not found`)
                            process.exit(1)
                        }
                    } else {
                        const chatChoices = chats.map(chat => ({
                            name: `${chat.name || 'Unnamed Chat'} (${chat.id}) - ${chat.privacy}`,
                            value: chat.id
                        }))

                        if (chatChoices.length === 0) {
                            error('No chats found. Please create a chat first.')
                            process.exit(1)
                        }

                        const chatAnswer = await inquirer.prompt([
                            {
                                type: 'list',
                                name: 'chatId',
                                message: 'Select a chat to deploy:',
                                choices: chatChoices
                            }
                        ])
                        finalChatId = chatAnswer.chatId
                    }
                }

                // Get chat details
                const spinner = ora('Getting chat details...').start()
                const chatDetails = await v0.chats.getById({ chatId: finalChatId })
                spinner.succeed('Chat details retrieved')

                if (!chatDetails.latestVersion) {
                    error('No versions found for this chat. Please generate some code first.')
                    process.exit(1)
                }

                if (!chatDetails.projectId) {
                    error('This chat is not associated with a project. Please assign it to a project first.')
                    process.exit(1)
                }

                const spinner2 = ora('Creating deployment...').start()

                const deployment = await v0.deployments.create({
                    projectId: chatDetails.projectId,
                    chatId: finalChatId,
                    versionId: chatDetails.latestVersion.id
                })

                spinner2.succeed('Deployment created successfully!')

                if (config.outputFormat === 'table') {
                    console.log(chalk.blue('Deployment Details:'))
                    console.log(`ID: ${deployment.id}`)
                    console.log(`Project ID: ${deployment.projectId}`)
                    console.log(`Chat ID: ${deployment.chatId}`)
                    console.log(`Version ID: ${deployment.versionId}`)
                    console.log(`Inspector URL: ${deployment.inspectorUrl}`)
                    console.log(`Web URL: ${deployment.webUrl}`)
                } else {
                    formatOutput(deployment, config.outputFormat)
                }

                success(`Deployment URL: ${deployment.webUrl}`)
                success(`Inspector URL: ${deployment.inspectorUrl}`)

            } catch (err) {
                error(`Failed to create deployment: ${err instanceof Error ? err.message : 'Unknown error'}`)
                process.exit(1)
            }
        })

    // Quick deploy - Create project, chat and deploy in one command
    deploy
        .command('quick')
        .description('Quick deploy: Create project, chat and deploy in one command')
        .argument('[message]', 'Initial message for the chat')
        .option('-p, --project-name <name>', 'Project name (optional - will prompt if not provided)')
        .option('-s, --system <system>', 'System message for the chat')
        .option('-m, --model <model>', 'Model to use', 'v0-1.5-md')
        .option('-o, --output <format>', 'Output format (json|table|yaml)', 'table')
        .action(async (message, options) => {
            try {
                const apiKey = await ensureApiKey()
                const v0 = createClient({ apiKey })
                const config = getConfig()

                let chatMessage = message
                let projectName = options.projectName

                // Interactive input if message not provided
                if (!chatMessage) {
                    const answers = await inquirer.prompt([
                        {
                            type: 'input',
                            name: 'message',
                            message: 'Enter your message for the chat:',
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

                // Interactive project name if not provided
                if (!projectName) {
                    const answers = await inquirer.prompt([
                        {
                            type: 'input',
                            name: 'projectName',
                            message: 'Enter project name:',
                            default: 'My Project',
                            validate: (input: string) => {
                                if (!input || input.trim().length === 0) {
                                    return 'Project name is required'
                                }
                                return true
                            }
                        }
                    ])
                    projectName = answers.projectName
                }

                const spinner = ora('Creating project...').start()

                // Create project
                const project = await v0.projects.create({
                    name: projectName,
                    description: `Project created from quick deploy with message: ${chatMessage.substring(0, 100)}...`
                })

                spinner.succeed(`Project created: ${project.name}`)

                const spinner2 = ora('Creating chat...').start()

                // Create chat
                const chat = await v0.chats.create({
                    message: chatMessage,
                    system: options.system,
                    projectId: project.id,
                    chatPrivacy: 'private',
                    modelConfiguration: {
                        modelId: options.model as any
                    }
                })

                spinner2.succeed('Chat created successfully!')

                // Wait a bit for the chat to process
                const spinner3 = ora('Waiting for chat to process...').start()
                await new Promise(resolve => setTimeout(resolve, 3000))

                // Get chat details to check if version is ready
                const chatDetails = await v0.chats.getById({ chatId: chat.id })

                if (!chatDetails.latestVersion) {
                    spinner3.fail('No version generated yet. Please try again in a moment.')
                    info(`Chat URL: ${chat.webUrl}`)
                    info('You can check the chat and try deploying again later.')
                    return
                }

                spinner3.succeed('Chat processed successfully!')

                const spinner4 = ora('Creating deployment...').start()

                // Create deployment
                const deployment = await v0.deployments.create({
                    projectId: project.id,
                    chatId: chat.id,
                    versionId: chatDetails.latestVersion.id
                })

                spinner4.succeed('Deployment created successfully!')

                if (config.outputFormat === 'table') {
                    console.log(chalk.blue('Quick Deploy Summary:'))
                    console.log(`Project: ${project.name} (${project.id})`)
                    console.log(`Chat: ${chat.name || 'Unnamed'} (${chat.id})`)
                    console.log(`Deployment: ${deployment.id}`)
                    console.log(`Chat URL: ${chat.webUrl}`)
                    console.log(`Deployment URL: ${deployment.webUrl}`)
                    console.log(`Inspector URL: ${deployment.inspectorUrl}`)
                } else {
                    formatOutput({
                        project,
                        chat,
                        deployment
                    }, config.outputFormat)
                }

                success(`🎉 Quick deploy completed successfully!`)
                success(`Chat URL: ${chat.webUrl}`)
                success(`Deployment URL: ${deployment.webUrl}`)
                success(`Inspector URL: ${deployment.inspectorUrl}`)

            } catch (err) {
                error(`Failed to create quick deploy: ${err instanceof Error ? err.message : 'Unknown error'}`)
                process.exit(1)
            }
        })

    // Get deployment details
    deploy
        .command('get')
        .description('Get deployment details')
        .argument('<deploymentId>', 'Deployment ID')
        .option('-o, --output <format>', 'Output format (json|table|yaml)', 'table')
        .action(async (deploymentId, options) => {
            try {
                const apiKey = await ensureApiKey()
                const v0 = createClient({ apiKey })
                const config = getConfig()

                const spinner = ora('Fetching deployment details...').start()

                const deployment = await v0.deployments.getById({ deploymentId })

                spinner.succeed('Deployment details retrieved')

                if (config.outputFormat === 'table') {
                    console.log(chalk.blue('Deployment Details:'))
                    console.log(`ID: ${deployment.id}`)
                    console.log(`Project ID: ${deployment.projectId}`)
                    console.log(`Chat ID: ${deployment.chatId}`)
                    console.log(`Version ID: ${deployment.versionId}`)
                    console.log(`Inspector URL: ${deployment.inspectorUrl}`)
                    console.log(`Web URL: ${deployment.webUrl}`)
                } else {
                    formatOutput(deployment, config.outputFormat)
                }

            } catch (err) {
                error(`Failed to get deployment: ${err instanceof Error ? err.message : 'Unknown error'}`)
                process.exit(1)
            }
        })

    // Delete deployment
    deploy
        .command('delete')
        .description('Delete a deployment')
        .argument('<deploymentId>', 'Deployment ID')
        .option('-f, --force', 'Skip confirmation')
        .action(async (deploymentId, options) => {
            try {
                const apiKey = await ensureApiKey()
                const v0 = createClient({ apiKey })

                if (!options.force) {
                    const answers = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'confirm',
                            message: `Are you sure you want to delete deployment ${deploymentId}?`,
                            default: false
                        }
                    ])

                    if (!answers.confirm) {
                        info('Deletion cancelled')
                        return
                    }
                }

                const spinner = ora('Deleting deployment...').start()

                await v0.deployments.delete({ deploymentId })

                spinner.succeed('Deployment deleted successfully!')
                success(`Deployment ${deploymentId} has been deleted`)

            } catch (err) {
                error(`Failed to delete deployment: ${err instanceof Error ? err.message : 'Unknown error'}`)
                process.exit(1)
            }
        })

    // Get deployment logs
    deploy
        .command('logs')
        .description('Get deployment logs')
        .argument('<deploymentId>', 'Deployment ID')
        .option('-s, --since <timestamp>', 'Get logs since timestamp')
        .option('-o, --output <format>', 'Output format (json|table|yaml)', 'table')
        .action(async (deploymentId, options) => {
            try {
                const apiKey = await ensureApiKey()
                const v0 = createClient({ apiKey })
                const config = getConfig()

                const spinner = ora('Fetching deployment logs...').start()

                const logs = await v0.deployments.findLogs({
                    deploymentId,
                    since: options.since
                })

                spinner.succeed('Deployment logs retrieved')

                if (logs.error) {
                    // Assuming warning is defined elsewhere or needs to be imported
                    // For now, commenting out as it's not in the original file
                    // warning(`Deployment has errors: ${logs.error}`)
                }

                if (config.outputFormat === 'table') {
                    if (logs.logs.length === 0) {
                        info('No logs found')
                        return
                    }

                    console.log(chalk.blue('Deployment Logs:'))
                    logs.logs.forEach((log, index) => {
                        console.log(`${index + 1}. ${log}`)
                    })

                    if (logs.nextSince) {
                        console.log(chalk.gray(`\nNext logs available since: ${logs.nextSince}`))
                    }
                } else {
                    formatOutput(logs, config.outputFormat)
                }

            } catch (err) {
                error(`Failed to get deployment logs: ${err instanceof Error ? err.message : 'Unknown error'}`)
                process.exit(1)
            }
        })

    // Get deployment errors
    deploy
        .command('errors')
        .description('Get deployment errors')
        .argument('<deploymentId>', 'Deployment ID')
        .option('-o, --output <format>', 'Output format (json|table|yaml)', 'table')
        .action(async (deploymentId, options) => {
            try {
                const apiKey = await ensureApiKey()
                const v0 = createClient({ apiKey })
                const config = getConfig()

                const spinner = ora('Fetching deployment errors...').start()

                const errors = await v0.deployments.findErrors({ deploymentId })

                spinner.succeed('Deployment errors retrieved')

                if (config.outputFormat === 'table') {
                    if (errors.error) {
                        console.log(chalk.red('Deployment Error:'))
                        console.log(`Error: ${errors.error}`)

                        if (errors.errorType) {
                            console.log(`Type: ${errors.errorType}`)
                        }

                        if (errors.formattedError) {
                            console.log(`Formatted: ${errors.formattedError}`)
                        }

                        if (errors.fullErrorText) {
                            console.log(`Full Error: ${errors.fullErrorText}`)
                        }
                    } else {
                        info('No errors found for this deployment')
                    }
                } else {
                    formatOutput(errors, config.outputFormat)
                }

            } catch (err) {
                error(`Failed to get deployment errors: ${err instanceof Error ? err.message : 'Unknown error'}`)
                process.exit(1)
            }
        })
} 