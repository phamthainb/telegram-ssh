# telegram-ssh
Simple manager and ssh to your servers.

# Use
- setup your ssh-key on each server you want ssh to.
- make && fill the file .env same as exam.env
- npm run install
- node bot.js or pm2 start bot.js

# commands
- /list: show list servers
- /current: show current server
- /add (root@abc)
- /rm (Index | IP): remove an server
- /connect (Index | IP)
- /exit: reset connected 
- /cmd (command): execute command
