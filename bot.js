const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const dotenv = require("dotenv");
const { Client } = require("ssh2");
dotenv.config();

const TOKEN = process.env.BOT_TOKEN || "";
const CHAT_ID = process.env.CHAT_ID || "";
const OWNER_IDS = process.env.OWNER_IDS || "";

const SERVERS_FILE = "servers.json";

// Load the servers from the JSON file
let servers = [];
let current = null;

// Connect to the SSH server using ssh2
const ssh = new Client();
let pwd = "~";

ssh.on("ready", async () => {
  await bot.sendMessage(CHAT_ID, "ssh successfully.");
});

const sshExcute = (command, ping) => {
  const conmm = `cd ${pwd} && ${command}`;

  ssh.exec(conmm, (err, stream) => {
    let result = "";

    if (err) {
      result = `${{ name: err.name, message: err.message, stack: err.stack }}`;
      console.log(err);
    }

    stream.on("data", (data) => {
      result += data.toString();
    });

    stream.on("close", async (code, signal) => {
      // save pwd
      if (command.includes("cd ")) {
        pwd = command.split("cd ")[1];
      }
      if (ping) {
        await bot.editMessageText(
          `<b>${pwd}# ${command}</b>\n${result || pwd}`,
          {
            message_id: ping.message_id,
            chat_id: ping.chat.id,
            parse_mode: "HTML",
          }
        );
      } else {
        await bot.sendMessage(
          CHAT_ID,
          `<b>${pwd}# ${command}</b>\n${result || pwd}`,
          {
            parse_mode: "HTML",
          }
        );
      }
    });
  });
};

if (fs.existsSync(SERVERS_FILE)) {
  servers = JSON.parse(fs.readFileSync(SERVERS_FILE, "utf8"));
} else {
  fs.writeFileSync(SERVERS_FILE, "[]", "utf8");
}

// Create a new Telegram bot instance
const bot = new TelegramBot(TOKEN, { polling: true });

async function checkOwner(msg) {
  if (!OWNER_IDS.includes(msg?.chat?.id)) {
    await bot.sendMessage(CHAT_ID, `Got other access\n${JSON.stringify(msg)}`);
    return false;
  }
  return true;
}

// bot.getMe().then((res) => {
//   console.log(res);
// });

bot
  .setMyCommands([
    { command: "add", description: "add new an server /add user@abc.com" },
    { command: "list", description: "list server" },
    { command: "current", description: "current server" },
    { command: "rm", description: "remove server" },
    { command: "connect", description: "/connect ID | IP" },
    { command: "exit", description: "exit" },
  ])
  .then((res) => {
    console.log(res);
  });

// CRUD
bot.onText(/\/list/, async (msg) => {
  const o = await checkOwner(msg);
  if (!o) {
    return;
  }
  let message = `List Server: ${servers.length}\n`;
  servers.forEach((s, i) => {
    message += `${i + 1}: ${s}\n`;
  });

  await bot.sendMessage(CHAT_ID, message, {
    disable_web_page_preview: true,
    protect_content: true,
  });
});
bot.onText(/\/current/, async (msg) => {
  const o = await checkOwner(msg);
  if (!o) {
    return;
  }
  if (!current) {
    await bot.sendMessage(
      CHAT_ID,
      `No server now, please connect one server before next.`
    );
    return;
  }
  await bot.sendMessage(CHAT_ID, `Current: ${current}`, {
    disable_web_page_preview: true,
    protect_content: true,
  });
});
bot.onText(/\/add (.+)/, async (msg, match) => {
  const o = await checkOwner(msg);
  if (!o) {
    await bot.sendMessage(CHAT_ID, "Value is invalid.");
    return;
  }
  const sv = match[1].trim().toLocaleLowerCase();
  if (sv.includes("@")) {
    servers.push(sv);
    fs.writeFileSync(SERVERS_FILE, JSON.stringify(servers), "utf8");
    await bot.sendMessage(CHAT_ID, `Add ${sv} success`, {
      disable_web_page_preview: true,
      protect_content: true,
    });
  } else {
    await bot.sendMessage(CHAT_ID, `${sv} is not valid`, {
      disable_web_page_preview: true,
      protect_content: true,
    });
  }
});
bot.onText(/\/rm (.+)/, async (msg, match) => {
  const o = await checkOwner(msg);
  if (!o) {
    return;
  }
  const sv = match[1].trim().toLocaleLowerCase();
  let find = null;
  if (
    sv.includes("@") &&
    servers.length !== servers.filter((s) => s !== sv).length
  ) {
    find = sv;
  } else {
    const index = parseFloat(sv) - 1;
    find = servers[index];
  }

  if (find) {
    servers = servers.filter((s) => s !== find);
    fs.writeFileSync(SERVERS_FILE, JSON.stringify(servers), "utf8");
    await bot.sendMessage(CHAT_ID, `Remove ${sv} success`, {
      disable_web_page_preview: true,
      protect_content: true,
    });
  } else {
    await bot.sendMessage(CHAT_ID, `${sv} is not valid`, {
      disable_web_page_preview: true,
      protect_content: true,
    });
  }
});

// ssh
bot.onText(/\/connect (.+)/, async (msg, match) => {
  const o = await checkOwner(msg);
  if (!o) {
    return;
  }
  const sv = match[1].trim().toLocaleLowerCase();
  let find = null;
  if (
    sv.includes("@") &&
    servers.length !== servers.filter((s) => s !== sv).length
  ) {
    find = sv;
  } else {
    const index = parseFloat(sv) - 1;
    find = servers[index];
  }
  if (find) {
    current = find;
    // try connect to current server
    const info = current.split("@");
    ssh.connect({
      host: info[1],
      username: info[0],
      privateKey: fs.readFileSync(process.env.PATH_PRIVATEKEY),
      port: 9022,
    });
  } else {
    await bot.sendMessage(CHAT_ID, `${sv} is not valid`, {
      disable_web_page_preview: true,
      protect_content: true,
    });
  }
});
bot.onText(/\/exit/, async (msg, match) => {
  const o = await checkOwner(msg);
  if (!o) {
    return;
  }
  current = null;
  ssh.end();

  await bot.sendMessage(CHAT_ID, `Reset current server`, {
    disable_web_page_preview: true,
    protect_content: true,
  });
});

bot.on("text", async (msg) => {
  const o = await checkOwner(msg);
  if (!o || isBotCommand(msg)) {
    return;
  }
  if (!current && ssh) {
    await bot.sendMessage(
      CHAT_ID,
      `No server now, please connect one server before next.`
    );
    return;
  }
  const ping = await bot.sendMessage(CHAT_ID, `exec...`);
  try {
    sshExcute(msg.text.trim(), ping);
  } catch (error) {
    console.log(error);
    await bot.editMessageText(`Error: ${JSON.stringify(error, null, 2)}`, {
      message_id: ping.message_id,
      chat_id: ping.chat.id,
    });
  }
});

// helper
function isBotCommand(message) {
  if (!message || !message.entities) {
    return false;
  }
  const botCommands = message.entities.filter(
    (entity) => entity.type === "bot_command"
  );
  return botCommands.length > 0;
}
