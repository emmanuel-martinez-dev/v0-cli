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
        baseUrl: {
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
    baseUrl: string
    outputFormat: 'json' | 'table' | 'yaml'
}

export function getConfig(): CliConfig {
    const apiKey = (config.get('apiKey') as string) ?? ''
    const defaultProject = (config.get('defaultProject') as string) ?? ''
    const baseUrl = (config.get('baseUrl') as string) ?? ''
    const storedFormat = config.get('outputFormat') as 'json' | 'table' | 'yaml' | undefined
    const outputFormat: 'json' | 'table' | 'yaml' = storedFormat && ['json', 'table', 'yaml'].includes(storedFormat)
        ? storedFormat
        : 'table'
    return { apiKey, defaultProject, baseUrl, outputFormat }
}

export function setConfig(key: keyof CliConfig, value: string): void {
    config.set(key, value)
}

export async function ensureApiKey(preferredApiKey?: string): Promise<string> {
    // Priority: explicit CLI option -> env (V0_API_KEY) -> stored config -> prompt
    let apiKey = preferredApiKey || process.env.V0_API_KEY || getConfig().apiKey

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
    console.log(`Base URL: ${currentConfig.baseUrl || 'Default (https://api.v0.dev/v1)'}`)
    console.log(`Output Format: ${currentConfig.outputFormat}`)
}

export function resolveBaseUrl(preferredBaseUrl?: string): string | undefined {
    const candidate = preferredBaseUrl || process.env.V0_BASE_URL || getConfig().baseUrl
    if (candidate && candidate.trim().length > 0) return candidate
    return undefined
}