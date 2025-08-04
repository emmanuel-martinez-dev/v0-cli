import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { getConfig, setConfig, clearConfig, showConfig } from '../utils/config.js'
import { success, error, info } from '../utils/output.js'

export function configCommand(program: Command): void {
    const config = program
        .command('config')
        .description('Manage CLI configuration')

    // Show current config
    config
        .command('show')
        .description('Show current configuration')
        .action(() => {
            showConfig()
        })

    // Set API key
    config
        .command('set-api-key')
        .description('Set API key')
        .argument('[apiKey]', 'API key to set')
        .action(async (apiKey) => {
            try {
                let finalApiKey = apiKey
                if (!finalApiKey) {
                    const answers = await inquirer.prompt([
                        {
                            type: 'password',
                            name: 'apiKey',
                            message: 'Enter your v0 API key:',
                            validate: (input: string) => {
                                if (!input || input.trim().length === 0) {
                                    return 'API key is required'
                                }
                                return true
                            }
                        }
                    ])
                    finalApiKey = answers.apiKey
                }

                setConfig('apiKey', finalApiKey)
                success('API key set successfully!')
                info('You can get your API key from: https://v0.dev/chat/settings/keys')

            } catch (err) {
                error(`Failed to set API key: ${err instanceof Error ? err.message : 'Unknown error'}`)
                process.exit(1)
            }
        })

    // Set default project
    config
        .command('set-default-project')
        .description('Set default project ID')
        .argument('[projectId]', 'Project ID to set as default')
        .action(async (projectId) => {
            try {
                let finalProjectId = projectId
                if (!finalProjectId) {
                    const answers = await inquirer.prompt([
                        {
                            type: 'input',
                            name: 'projectId',
                            message: 'Enter project ID to set as default:',
                            validate: (input: string) => {
                                if (!input || input.trim().length === 0) {
                                    return 'Project ID is required'
                                }
                                return true
                            }
                        }
                    ])
                    finalProjectId = answers.projectId
                }

                setConfig('defaultProject', finalProjectId)
                success('Default project set successfully!')

            } catch (err) {
                error(`Failed to set default project: ${err instanceof Error ? err.message : 'Unknown error'}`)
                process.exit(1)
            }
        })

    // Set output format
    config
        .command('set-output-format')
        .description('Set default output format')
        .argument('[format]', 'Output format (json|table|yaml)')
        .action(async (format) => {
            try {
                let finalFormat = format
                if (!finalFormat) {
                    const answers = await inquirer.prompt([
                        {
                            type: 'list',
                            name: 'format',
                            message: 'Select default output format:',
                            choices: [
                                { name: 'Table (default)', value: 'table' },
                                { name: 'JSON', value: 'json' },
                                { name: 'YAML', value: 'yaml' }
                            ]
                        }
                    ])
                    finalFormat = answers.format
                }

                if (!['json', 'table', 'yaml'].includes(finalFormat)) {
                    error('Invalid output format. Must be one of: json, table, yaml')
                    process.exit(1)
                }

                setConfig('outputFormat', finalFormat)
                success(`Output format set to: ${finalFormat}`)

            } catch (err) {
                error(`Failed to set output format: ${err instanceof Error ? err.message : 'Unknown error'}`)
                process.exit(1)
            }
        })

    // Clear config
    config
        .command('clear')
        .description('Clear all configuration')
        .option('-f, --force', 'Skip confirmation')
        .action(async (options) => {
            try {
                if (!options.force) {
                    const answers = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'confirm',
                            message: 'Are you sure you want to clear all configuration? This will remove your API key and other settings.',
                            default: false
                        }
                    ])

                    if (!answers.confirm) {
                        info('Configuration clear cancelled')
                        return
                    }
                }

                clearConfig()
                success('Configuration cleared successfully!')

            } catch (err) {
                error(`Failed to clear configuration: ${err instanceof Error ? err.message : 'Unknown error'}`)
                process.exit(1)
            }
        })

    // Interactive config setup
    config
        .command('setup')
        .description('Interactive configuration setup')
        .action(async () => {
            try {
                console.log(chalk.blue('Welcome to v0 CLI configuration setup!'))
                console.log(chalk.gray('This will help you configure the CLI for first use.\n'))

                const answers = await inquirer.prompt([
                    {
                        type: 'password',
                        name: 'apiKey',
                        message: 'Enter your v0 API key:',
                        validate: (input: string) => {
                            if (!input || input.trim().length === 0) {
                                return 'API key is required'
                            }
                            return true
                        }
                    },
                    {
                        type: 'input',
                        name: 'defaultProject',
                        message: 'Enter default project ID (optional):',
                        default: ''
                    },
                    {
                        type: 'list',
                        name: 'outputFormat',
                        message: 'Select default output format:',
                        choices: [
                            { name: 'Table (recommended)', value: 'table' },
                            { name: 'JSON', value: 'json' },
                            { name: 'YAML', value: 'yaml' }
                        ],
                        default: 'table'
                    }
                ])

                setConfig('apiKey', answers.apiKey)
                if (answers.defaultProject) {
                    setConfig('defaultProject', answers.defaultProject)
                }
                setConfig('outputFormat', answers.outputFormat)

                success('Configuration setup completed successfully!')
                console.log(chalk.gray('\nYou can now use the v0 CLI. Try: v0 --help'))

            } catch (err) {
                error(`Failed to setup configuration: ${err instanceof Error ? err.message : 'Unknown error'}`)
                process.exit(1)
            }
        })
} 