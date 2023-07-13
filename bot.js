const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const { exec } = require("child_process");
const dotenv = require("dotenv");
dotenv.config();

const TOKEN = process.env.BOT_TOKEN || "";
const CHAT_ID = process.env.CHAT_ID || "";
const OWNER_IDS = process.env.OWNER_IDS || "";

const SERVERS_FILE = "servers.json";

// Load the servers from the JSON file
let servers = [];
let current = null;

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

// /list
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
// /current
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

// /add (root@abc)
bot.onText(/\/add (.+)/, async (msg, match) => {
  const o = await checkOwner(msg);
  if (!o) {
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

// /rm (Index | IP)
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

// /connect (Index | IP)
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
    await bot.sendMessage(CHAT_ID, `Set ${current} is current server`, {
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

// /exit
bot.onText(/\/exit/, async (msg, match) => {
  const o = await checkOwner(msg);
  if (!o) {
    return;
  }
  current = null;
  await bot.sendMessage(CHAT_ID, `Reset current server`, {
    disable_web_page_preview: true,
    protect_content: true,
  });
});

// /cmd (command)
bot.onText(/\/cmd (.+)/, async (msg, match) => {
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

  try {
    console.log(match);
    const command = `ssh ${current} '${match[1]}'`;
    const ping = await bot.sendMessage(CHAT_ID, `Connecting...`);

    exec(command, async function (error, stdout, stderr) {
      console.log({ error, stdout, stderr });
      if (stderr) {
        await bot.editMessageText(`${current} stderr: ${stderr}`, {
          message_id: ping.message_id,
          chat_id: ping.chat.id,
        });
        return;
      }
      if (error) {
        await bot.editMessageText(
          `${current} error: ${JSON.stringify(error, null, 2)}`,
          {
            message_id: ping.message_id,
            chat_id: ping.chat.id,
          }
        );
        return;
      }

      console.log(stdout);
      await bot.editMessageText(`${current} stdout:\n` + stdout, {
        message_id: ping.message_id,
        chat_id: ping.chat.id,
      });
    });
  } catch (error) {
    await bot.editMessageText(`Error: ${JSON.stringify(error, null, 2)}`, {
      message_id: ping.message_id,
      chat_id: ping.chat.id,
    });
  }
});
