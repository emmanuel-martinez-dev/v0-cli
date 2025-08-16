import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { createClient } from 'v0-sdk'
import { ensureApiKey, getConfig, resolveBaseUrl } from '../utils/config.js'
import { formatOutput, success, error, info, formatUser, printSdkError } from '../utils/output.js'

export function userCommand(program: Command): void {
    const user = program
        .command('user')
        .description('Manage v0 user information')

    // Get user info
    user
        .command('info')
        .description('Get user information')
        .option('-o, --output <format>', 'Output format (json|table|yaml)')
        .action(async (options) => {
            try {
                const globalOpts = (program.opts && program.opts()) || {}
                const apiKey = await ensureApiKey(globalOpts.apiKey)
                const baseUrl = resolveBaseUrl(globalOpts.baseUrl)
                const v0 = createClient({ apiKey, baseUrl })
                const config = getConfig()
                const outputFormat = (options.output || globalOpts.output || config.outputFormat) as 'json' | 'table' | 'yaml'

                const spinner = ora('Fetching user information...').start()

                const user = await v0.user.get()

                spinner.succeed('User information retrieved')

                if (outputFormat === 'table') {
                    formatUser(user)
                } else {
                    formatOutput(user, outputFormat)
                }

            } catch (err) {
                error(`Failed to get user information: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    // Get user plan
    user
        .command('plan')
        .description('Get user plan and billing information')
        .option('-o, --output <format>', 'Output format (json|table|yaml)')
        .action(async (options) => {
            try {
                const globalOpts = (program.opts && program.opts()) || {}
                const apiKey = await ensureApiKey(globalOpts.apiKey)
                const baseUrl = resolveBaseUrl(globalOpts.baseUrl)
                const v0 = createClient({ apiKey, baseUrl })
                const config = getConfig()
                const outputFormat = (options.output || globalOpts.output || config.outputFormat) as 'json' | 'table' | 'yaml'

                const spinner = ora('Fetching user plan...').start()

                const plan = await v0.user.getPlan()

                spinner.succeed('User plan retrieved')

                if (outputFormat === 'table') {
                    console.log(chalk.blue('User Plan:'))
                    console.log(`Plan: ${plan.plan}`)
                    console.log(`Billing Cycle Start: ${new Date(plan.billingCycle.start).toLocaleDateString()}`)
                    console.log(`Billing Cycle End: ${new Date(plan.billingCycle.end).toLocaleDateString()}`)
                    console.log(`Balance Total: ${plan.balance.total}`)
                    console.log(`Balance Remaining: ${plan.balance.remaining}`)
                } else {
                    formatOutput(plan, outputFormat)
                }

            } catch (err) {
                error(`Failed to get user plan: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    // Get user billing
    user
        .command('billing')
        .description('Get detailed billing information')
        .option('-s, --scope <scope>', 'Billing scope')
        .option('-o, --output <format>', 'Output format (json|table|yaml)')
        .action(async (options) => {
            try {
                const globalOpts = (program.opts && program.opts()) || {}
                const apiKey = await ensureApiKey(globalOpts.apiKey)
                const baseUrl = resolveBaseUrl(globalOpts.baseUrl)
                const v0 = createClient({ apiKey, baseUrl })
                const config = getConfig()
                const outputFormat = (options.output || globalOpts.output || config.outputFormat) as 'json' | 'table' | 'yaml'

                const spinner = ora('Fetching billing information...').start()

                const billing = await v0.user.getBilling({
                    scope: options.scope
                })

                spinner.succeed('Billing information retrieved')

                if (outputFormat === 'table') {
                    console.log(chalk.blue('Billing Information:'))
                    console.log(`Billing Type: ${billing.billingType}`)

                    if (billing.billingType === 'token') {
                        const data = billing.data
                        console.log(`Plan: ${data.plan}`)
                        console.log(`Role: ${data.role}`)
                        console.log(`Billing Mode: ${data.billingMode || 'production'}`)
                        console.log(`Billing Cycle Start: ${new Date(data.billingCycle.start).toLocaleDateString()}`)
                        console.log(`Billing Cycle End: ${new Date(data.billingCycle.end).toLocaleDateString()}`)
                        console.log(`Balance Total: ${data.balance.total}`)
                        console.log(`Balance Remaining: ${data.balance.remaining}`)
                        console.log(`On-Demand Balance: ${data.onDemand.balance}`)
                    } else if (billing.billingType === 'legacy') {
                        const data = billing.data
                        console.log(`Limit: ${data.limit}`)
                        console.log(`Remaining: ${data.remaining || 'Unknown'}`)
                        if (data.reset) {
                            console.log(`Reset: ${new Date(data.reset).toLocaleDateString()}`)
                        }
                    }
                } else {
                    formatOutput(billing, outputFormat)
                }

            } catch (err) {
                error(`Failed to get billing information: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    // Get user scopes
    user
        .command('scopes')
        .description('Get user scopes')
        .option('-o, --output <format>', 'Output format (json|table|yaml)')
        .action(async (options) => {
            try {
                const globalOpts = (program.opts && program.opts()) || {}
                const apiKey = await ensureApiKey(globalOpts.apiKey)
                const baseUrl = resolveBaseUrl(globalOpts.baseUrl)
                const v0 = createClient({ apiKey, baseUrl })
                const config = getConfig()
                const outputFormat = (options.output || globalOpts.output || config.outputFormat) as 'json' | 'table' | 'yaml'

                const spinner = ora('Fetching user scopes...').start()

                const scopes = await v0.user.getScopes()

                spinner.succeed('User scopes retrieved')

                if (outputFormat === 'table') {
                    if (scopes.data.length === 0) {
                        info('No scopes found')
                        return
                    }

                    console.log(chalk.blue('User Scopes:'))
                    scopes.data.forEach(scope => {
                        console.log(`- ${scope.name || scope.id}`)
                    })
                } else {
                    formatOutput(scopes, outputFormat)
                }

            } catch (err) {
                error(`Failed to get user scopes: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })

    // Get rate limits
    user
        .command('rate-limits')
        .description('Get rate limit information')
        .option('-s, --scope <scope>', 'Rate limit scope')
        .option('-o, --output <format>', 'Output format (json|table|yaml)')
        .action(async (options) => {
            try {
                const globalOpts = (program.opts && program.opts()) || {}
                const apiKey = await ensureApiKey(globalOpts.apiKey)
                const v0 = createClient({ apiKey })
                const config = getConfig()
                const outputFormat = (options.output || globalOpts.output || config.outputFormat) as 'json' | 'table' | 'yaml'

                const spinner = ora('Fetching rate limits...').start()

                const rateLimits = await v0.rateLimits.find({
                    scope: options.scope
                })

                spinner.succeed('Rate limits retrieved')

                if (outputFormat === 'table') {
                    console.log(chalk.blue('Rate Limits:'))
                    console.log(`Limit: ${rateLimits.limit}`)
                    console.log(`Remaining: ${rateLimits.remaining || 'Unknown'}`)
                    if (rateLimits.reset) {
                        console.log(`Reset: ${new Date(rateLimits.reset).toLocaleDateString()}`)
                    }
                } else {
                    formatOutput(rateLimits, outputFormat)
                }

            } catch (err) {
                error(`Failed to get rate limits: ${err instanceof Error ? err.message : 'Unknown error'}`)
                const globalOpts = (program.opts && program.opts()) || {}
                printSdkError(err, !!globalOpts.verbose)
                process.exit(1)
            }
        })
} 