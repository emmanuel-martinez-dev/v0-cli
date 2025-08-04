import Conf from 'conf'
import chalk from 'chalk'
import inquirer from 'inquirer'

const config = new Conf({
    projectName: 'v0-cli',
    schema: {
        apiKey: {
            type: 'string',
            default: ''
        },
        defaultProject: {
            type: 'string',
            default: ''
        },
        outputFormat: {
            type: 'string',
            enum: ['json', 'table', 'yaml'],
            default: 'table'
        }
    }
})

export interface CliConfig {
    apiKey: string
    defaultProject: string
    outputFormat: 'json' | 'table' | 'yaml'
}

export function getConfig(): CliConfig {
    return {
        apiKey: config.get('apiKey') as string,
        defaultProject: config.get('defaultProject') as string,
        outputFormat: config.get('outputFormat') as 'json' | 'table' | 'yaml'
    }
}

export function setConfig(key: keyof CliConfig, value: string): void {
    config.set(key, value)
}

export async function ensureApiKey(): Promise<string> {
    let apiKey = getConfig().apiKey

    if (!apiKey) {
        console.log(chalk.yellow('No API key found. Please provide your v0 API key.'))
        console.log(chalk.blue('You can get your API key from: https://v0.dev/chat/settings/keys'))

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

        apiKey = answers.apiKey
        setConfig('apiKey', apiKey)
        console.log(chalk.green('API key saved successfully!'))
    }

    return apiKey
}

export function clearConfig(): void {
    config.clear()
}

export function showConfig(): void {
    const currentConfig = getConfig()
    console.log(chalk.blue('Current Configuration:'))
    console.log(`API Key: ${currentConfig.apiKey ? '***' + currentConfig.apiKey.slice(-4) : 'Not set'}`)
    console.log(`Default Project: ${currentConfig.defaultProject || 'Not set'}`)
    console.log(`Output Format: ${currentConfig.outputFormat}`)
} 