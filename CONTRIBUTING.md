# Contributing to v0 CLI

Thank you for your interest in contributing to v0 CLI! This document provides guidelines for contributing to the project.

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or pnpm
- Git

### Development Setup
```bash
# Clone the repository
git clone https://github.com/vercel/v0-sdk.git
cd v0-sdk/cli

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run in development mode
npm run dev -- --help
```

## Development Workflow

### 1. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes
- Follow the existing code style
- Add tests for new functionality
- Update documentation if needed

### 3. Test Your Changes
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Build the project
npm run build

# Test the CLI
node dist/index.js --help
```

### 4. Commit Your Changes
```bash
git add .
git commit -m "feat: add new command for X"
```

### 5. Push and Create a Pull Request
```bash
git push origin feature/your-feature-name
```

## Code Style

### TypeScript
- Use TypeScript for all new code
- Follow the existing type definitions
- Add proper JSDoc comments for public APIs

### Commands
- Follow the existing command structure
- Use descriptive command and option names
- Add proper help text for all commands

### Error Handling
- Use the existing error utilities
- Provide clear and helpful error messages
- Handle edge cases gracefully

### Testing
- Write tests for all new functionality
- Use descriptive test names
- Mock external dependencies appropriately

## Project Structure

```
cli/
├── src/
│   ├── commands/          # Command implementations
│   ├── utils/             # Utility functions
│   └── __tests__/         # Test files
├── dist/                  # Compiled output
├── examples/              # Usage examples
└── docs/                 # Documentation
```

## Adding New Commands

### 1. Create Command File
```typescript
// src/commands/example.ts
import { Command } from 'commander'
import { createClient } from 'v0-sdk'
import { ensureApiKey } from '../utils/config.js'
import { success, error } from '../utils/output.js'

export function exampleCommand(program: Command): void {
    const example = program
        .command('example')
        .description('Example command description')

    example
        .command('action')
        .description('Perform an action')
        .argument('<param>', 'Parameter description')
        .action(async (param) => {
            try {
                const apiKey = await ensureApiKey()
                const v0 = createClient({ apiKey })
                
                // Your implementation here
                
                success('Action completed successfully!')
            } catch (err) {
                error(`Failed to perform action: ${err instanceof Error ? err.message : 'Unknown error'}`)
                process.exit(1)
            }
        })
}
```

### 2. Register Command
```typescript
// src/index.ts
import { exampleCommand } from './commands/example.js'

// Add to program
exampleCommand(program)
```

### 3. Add Tests
```typescript
// src/__tests__/example.test.ts
import { describe, it, expect, vi } from 'vitest'

describe('Example Command', () => {
    it('should perform action correctly', () => {
        // Your test implementation
    })
})
```

## Testing Guidelines

### Unit Tests
- Test individual functions and utilities
- Mock external dependencies
- Test error cases and edge cases

### Integration Tests
- Test command execution
- Test API interactions (with mocks)
- Test configuration management

### Test Structure
```typescript
describe('Feature', () => {
    describe('when condition is met', () => {
        it('should behave correctly', () => {
            // Test implementation
        })
    })
})
```

## Documentation

### Code Documentation
- Add JSDoc comments for public APIs
- Include examples in comments
- Document complex logic

### User Documentation
- Update README.md for new features
- Add examples to examples.md
- Update command help text

## Pull Request Guidelines

### Before Submitting
- [ ] Code follows the project style
- [ ] Tests pass locally
- [ ] Documentation is updated
- [ ] No console.log statements in production code
- [ ] Error handling is implemented

### Pull Request Title
Use conventional commits format:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `test:` for test additions
- `refactor:` for code refactoring

### Pull Request Description
- Describe the changes made
- Explain the reasoning behind changes
- Include any breaking changes
- Add screenshots if applicable

## Getting Help

- Open an issue for bugs or feature requests
- Join our community discussions
- Check existing issues and pull requests

## Code of Conduct

Please be respectful and inclusive in all interactions. We welcome contributions from everyone regardless of background or experience level.

## License

By contributing to this project, you agree that your contributions will be licensed under the MIT License. 