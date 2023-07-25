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
- /rm (index | root@abc): remove an server
- /connect (index | root@abc)
- /exit: reset connected 
- /cmd (command): execute command at current server

# Demo
<img src="https://raw.githubusercontent.com/phamthainb/telegram-ssh/master/demo.png" alt="telegram-ssh" width="350" height="500" style="object-fit: cover;">
