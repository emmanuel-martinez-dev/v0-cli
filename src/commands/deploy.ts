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

    // Create deployment
    deploy
        .command('create')
        .description('Create a new deployment')
        .argument('<projectId>', 'Project ID')
        .argument('<chatId>', 'Chat ID')
        .argument('<versionId>', 'Version ID')
        .option('-o, --output <format>', 'Output format (json|table|yaml)', 'table')
        .action(async (projectId, chatId, versionId, options) => {
            try {
                const apiKey = await ensureApiKey()
                const v0 = createClient({ apiKey })
                const config = getConfig()

                const spinner = ora('Creating deployment...').start()

                const deployment = await v0.deployments.create({
                    projectId,
                    chatId,
                    versionId
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