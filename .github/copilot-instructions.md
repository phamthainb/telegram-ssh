# Telegram SSH Manager

A Node.js Telegram bot application for managing and executing SSH commands on remote servers through Telegram chat interface.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap and Setup
- Install Node.js dependencies:
  - `npm install` -- takes 3-4 seconds on fresh install. NEVER CANCEL. Set timeout to 60+ minutes for safety.
- The application has NO build process - it runs directly with Node.js.
- No test framework exists - only basic parsing tests in `test.js`.
- No linting configuration exists beyond VSCode prettier settings.

### Running the Application
- **CRITICAL**: The application requires valid Telegram bot credentials and SSH access to function fully.
- Test basic functionality (parsing and startup):
  - `node test.js` -- tests helper function parsing logic, completes immediately.
  - `node bot.js --help` -- shows command line options, completes immediately.
- Start the bot (requires valid tokens):
  ```bash
  node bot.js --bot_token "your-telegram-bot-token" --chat_id "your-chat-id" --owner_ids "comma-separated-owner-ids" --path_privatekey "/path/to/private/key" --servers_file "/path/to/servers.json"
  ```
- **NETWORK LIMITATION**: The bot will fail with network errors in environments without internet access to api.telegram.org.

### Security and Dependencies
- **CRITICAL**: Run `npm audit` to check for security vulnerabilities. As of current state: 8 vulnerabilities (1 low, 4 moderate, 1 high, 2 critical).
- Fix non-breaking security issues: `npm audit fix`
- Fix all security issues (may break compatibility): `npm audit fix --force`
- **ALWAYS** address security vulnerabilities before deployment.

## Validation

### Basic Validation Steps
- ALWAYS run these commands after making changes:
  - `npm install` -- ensure dependencies are properly installed
  - `node test.js` -- verify helper function parsing logic works
  - `node bot.js --help` -- confirm CLI interface is intact
- Test bot startup with dummy parameters (will fail at network call, which is expected):
  ```bash
  timeout 5s node bot.js --bot_token "test" --chat_id "123" --owner_ids "123" --path_privatekey "/tmp/test_key" --servers_file "/tmp/test_servers.json"
  ```

### File Format Validation
- **CRITICAL**: The servers file MUST be valid JSON array format or the application will crash.
- Test with invalid JSON: Application crashes with "TypeError: serversFromFile.filter is not a function"
- Test with valid JSON: Application starts successfully until network calls.
- Always validate servers.json format: `[{"host": "example.com", "username": "user", "port": 22}]`

### End-to-End Testing (Requires External Services)
Since this is a Telegram bot for SSH management, complete validation requires:
1. Valid Telegram bot token from @BotFather
2. Configured SSH servers with key-based authentication
3. Testing bot commands: `/ssh`, `/list`, `/add`, `/rm`, `/current`, `/exit`
4. **Note**: Full testing cannot be performed in isolated environments without internet access.

## Common Tasks

### Repo Structure
```
.
├── README.md           # Comprehensive documentation with examples
├── package.json        # Dependencies only (no scripts defined)
├── package-lock.json   # Dependency lock file
├── bot.js             # Main application entry point
├── helper.js          # Utility functions (parseInput, validateServerData, pingHost)
├── test.js            # Basic parsing logic tests
├── demo/              # Screenshot examples
├── .vscode/           # VSCode settings with prettier config
└── .gitignore         # Excludes node_modules, servers.json, .env, dev.sh
```

### Key Source Files
- **bot.js**: Main Telegram bot application with SSH client integration
- **helper.js**: Utility functions for input parsing and validation
- **test.js**: Test cases for the parseInput function

### Dependencies
```json
{
  "dotenv": "^16.3.1",
  "node-telegram-bot-api": "^0.61.0", 
  "nodemon": "^3.0.1",
  "ssh2": "^1.14.0",
  "yargs": "^17.7.2"
}
```

### Required Command Line Arguments
All arguments are mandatory:
- `--bot_token` / `-b`: Telegram bot token from @BotFather
- `--chat_id` / `-c`: Telegram chat ID for bot messages
- `--owner_ids` / `-o`: Comma-separated list of authorized user IDs
- `--path_privatekey` / `-p`: Path to SSH private key file
- `--servers_file` / `-s`: Path to servers JSON file (defaults to `/var/telegram-ssh/servers.json`)

## Troubleshooting

### Common Issues
- **Application crashes on startup**: Check that servers file is valid JSON array format.
- **Network errors**: Expected when running without internet access to api.telegram.org.
- **SSH connection failures**: Requires valid SSH keys and accessible servers.
- **Security warnings**: Address with `npm audit fix` or `npm audit fix --force`.

### Error Patterns
- `TypeError: serversFromFile.filter is not a function`: Invalid servers JSON file format.
- `getaddrinfo ENOTFOUND api.telegram.org`: Expected network error in isolated environments.
- `EFATAL` polling errors: Telegram API connectivity issues.

### Development Notes
- No CI/CD workflows exist in the repository.
- No formal linting setup beyond VSCode prettier configuration.
- Application is designed for production use with process managers like PM2.
- Consider implementing try-catch blocks for SSH failures (noted in TODO).
- Binary compilation is planned but not implemented (noted in TODO).

## Timeout Recommendations
- `npm install`: Use 60+ second timeout (actual time: 3-4 seconds)
- `node test.js`: Immediate completion, use default timeout
- `node bot.js --help`: Immediate completion, use default timeout
- Bot startup testing: Use 10+ second timeout for network failure detection

## CRITICAL Reminders
- **NEVER CANCEL** long-running commands without cause.
- **ALWAYS** validate servers.json file format before starting the bot.
- **ALWAYS** run `npm audit` and address security vulnerabilities.
- **REMEMBER** that full testing requires external Telegram and SSH services.
- The application has NO build process - it runs directly with Node.js.