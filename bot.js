// @ts-check
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const { Client } = require("ssh2");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const {
  isBotCommand,
  validateServerData,
  parseInput,
  pingHost,
} = require("./helper");
var exec = require("child_process").exec;

const argv = yargs(hideBin(process?.argv))
  .option("bot_token", {
    alias: "b",
    describe: "Telegram bot token",
    type: "string",
    demandOption: true,
  })
  .option("chat_id", {
    alias: "c",
    describe: "Telegram chat ID",
    type: "string",
    demandOption: true,
  })
  .option("owner_ids", {
    alias: "o",
    describe: "Comma-separated list of owner chat IDs",
    type: "string",
    demandOption: true,
  })
  .option("path_privatekey", {
    alias: "p",
    describe: "Path to SSH private key",
    type: "string",
    demandOption: true,
  })
  .option("servers_file", {
    alias: "s",
    describe: "Path to servers JSON file",
    type: "string",
    demandOption: true,
    default: "/var/telegram-ssh/servers.json",
  }).argv;

const TOKEN = argv?.bot_token,
  CHAT_ID = argv?.chat_id,
  OWNER_IDS = argv?.owner_ids?.split(","),
  PATH_PRIVATEKEY = argv?.path_privatekey,
  SERVERS_FILE = argv?.servers_file;

//
console.log({ TOKEN, CHAT_ID, OWNER_IDS, PATH_PRIVATEKEY, SERVERS_FILE });

// Load the servers from the JSON file
let servers = [];
let current = null;

if (fs.existsSync(SERVERS_FILE)) {
  let serversFromFile = JSON.parse(fs.readFileSync(SERVERS_FILE, "utf8"));
  servers = serversFromFile.filter(validateServerData);

  if (servers.length !== serversFromFile.length) {
    fs.writeFileSync(SERVERS_FILE, JSON.stringify(servers, null, 2), "utf8");
    console.log("Removed invalid server entries from servers.json");
  }
} else {
  fs.writeFileSync(SERVERS_FILE, "[]", "utf8");
  servers = [];
}

// Connect to the SSH server using ssh2
const ssh = new Client();
let pwd = "~";

ssh.on("ready", async () => {
  await bot.sendMessage(CHAT_ID, "SSH successfully connected.");
});

const sshExecute = (command, ping) => {
  const cmd = `cd ${pwd} && ${command}`;

  ssh.exec(cmd, (err, stream) => {
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
          `<b>${current?.username}:${current?.host}\n${pwd}# ${command}</b>\n${
            result || pwd
          }`,
          {
            message_id: ping.message_id,
            chat_id: ping.chat.id,
            parse_mode: "HTML",
          }
        );
      } else {
        await bot.sendMessage(
          CHAT_ID,
          `<b>${current?.username}:${current?.host}\n${pwd}# ${command}</b>\n${
            result || pwd
          }`,
          {
            parse_mode: "HTML",
          }
        );
      }
    });
  });
};

const bot = new TelegramBot(TOKEN, { polling: true });

async function checkOwner(msg) {
  if (!OWNER_IDS.includes(String(msg.chat.id))) {
    await bot.sendMessage(
      CHAT_ID,
      `Unauthorized access\n${JSON.stringify(msg)}`
    );
    return false;
  }
  return true;
}

bot.getMe().then((res) => {
  console.log(JSON.stringify(res, null, 2));
  bot.sendMessage(CHAT_ID, "Hello there");
});

bot
  .setMyCommands([
    { command: "add", description: "Add a new server /add root@10.10.1.1" },
    { command: "list", description: "List servers" },
    { command: "current", description: "Current server" },
    { command: "rm", description: "Remove server" },
    { command: "ssh", description: "/ssh index | /ssh root@10.10.1.1" },
    { command: "exit", description: "Exit" },
    { command: "cmd", description: "Run a command on the connected server" },
  ])
  .then((res) => {
    console.log("setMyCommands", res);
  });

//
bot.onText(/\/cmd (.+)/, async (msg, match) => {
  const o = await checkOwner(msg);
  if (!o) {
    return;
  }
  if (!match) {
    await bot.sendMessage(CHAT_ID, "Invalid command args.", {
      disable_web_page_preview: true,
    });
    return;
  }

  try {
    const command = match[1];
    exec(command, async function (error, stdout, stderr) {
      console.log({ error, stdout, stderr });

      if (stderr) {
        await bot.sendMessage(CHAT_ID, `stderr: ${stderr}`);
        return;
      }

      if (error) {
        await bot.sendMessage(
          CHAT_ID,
          `error: ${JSON.stringify(error, null, 2)}`
        );
        return;
      }

      console.log(stdout);
      await bot.sendMessage(CHAT_ID, "stdout:\n" + stdout);
    });
  } catch (error) {
    await bot.sendMessage(CHAT_ID, `Error: ${JSON.stringify(error, null, 2)}`);
  }
});

// CRUD
bot.onText(/\/list/, async (msg) => {
  const o = await checkOwner(msg);
  if (!o) {
    return;
  }

  let message = `List of Servers (${servers.length}):\n`;
  if (servers.length > 0) {
    servers.forEach((s, i) => {
      message += `${i + 1}: ${s.username}@${s.host}:${s.port} ${
        s.note ? `(${s?.note})` : ""
      }\n`;
    });
  } else {
    message +=
      "No servers found. To add a new server, use the following command format:\n\n" +
      "/add user@host -p port -n note -pri /path/to/private/key -pass password\n\n" +
      "Example:\n" +
      "/add root@10.1.1.1 -p 22 -n 'wallet server' -pri /home/.ssh/id_rsa -pass 'your_password'";
  }

  await bot.sendMessage(CHAT_ID, message, {
    disable_web_page_preview: true,
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
      `No server connected. Please connect to a server first.`
    );
    return;
  }
  await bot.sendMessage(
    CHAT_ID,
    `Current: ${current.username}@${current.host}:${current.port}`,
    {
      disable_web_page_preview: true,
      protect_content: true,
    }
  );
});

bot.onText(/\/add (.+)/, async (msg, match) => {
  const o = await checkOwner(msg);
  if (!o) {
    return;
  }
  if (!match) {
    await bot.sendMessage(CHAT_ID, "Invalid command args.", {
      disable_web_page_preview: true,
    });
    return;
  }

  const input = match[1].trim();

  const { _args, ...data } = parseInput(input, {
    password: "-pass",
    port: "-p",
    note: "-n",
    pathPrivateKey: "-pri",
    keyPassword: "-keypass",
  });

  if (!_args[0]) {
    await bot.sendMessage(
      CHAT_ID,
      "Invalid format.\nUse /add user@host -p port -pass password -n note -pri /path/to/private/key -keypass keypassword",
      {
        disable_web_page_preview: true,
        protect_content: true,
      }
    );
    return;
  }

  const userHost = _args[0]?.trim();
  const [username, host] = userHost.split("@");

  if (!username || !host) {
    await bot.sendMessage(
      CHAT_ID,
      "Invalid format. Ensure 'user@host' is correctly provided.",
      {
        disable_web_page_preview: true,
        protect_content: true,
      }
    );
    return;
  }

  // ping to host for testing connection
  try {
    await pingHost(host);
  } catch (error) {
    await bot.sendMessage(CHAT_ID, error?.message, {
      disable_web_page_preview: true,
    });
    return;
  }

  const resolvedPathPrivateKey = data?.pathPrivateKey || PATH_PRIVATEKEY;

  if (!fs.existsSync(resolvedPathPrivateKey)) {
    await bot.sendMessage(
      CHAT_ID,
      `File not found\n${resolvedPathPrivateKey}`,
      {
        disable_web_page_preview: true,
      }
    );
    return;
  }

  if (!resolvedPathPrivateKey && !data?.password) {
    await bot.sendMessage(
      CHAT_ID,
      "At least one of -pri or -pass must be provided.",
      {
        disable_web_page_preview: true,
        protect_content: true,
      }
    );
    return;
  }

  if (data?.keyPassword && !resolvedPathPrivateKey) {
    await bot.sendMessage(
      CHAT_ID,
      "Both of -pri and -keypass must be provided.",
      {
        disable_web_page_preview: true,
      }
    );
    return;
  }

  const newServer = {
    host,
    username,
    password: data?.password,
    port: data?.port || "22",
    pathPrivateKey: resolvedPathPrivateKey,
    keypass: data?.keyPassword || "",
    note: data?.note || "",
    time: new Date(),
  };

  servers.push(newServer);

  fs.writeFileSync(SERVERS_FILE, JSON.stringify(servers, null, 2), "utf8");
  await bot.sendMessage(
    CHAT_ID,
    `Added ${username}@${host}:${newServer.port} successfully`,
    {
      disable_web_page_preview: true,
    }
  );
});

bot.onText(/\/rm (.+)/, async (msg, match) => {
  const o = await checkOwner(msg);
  if (!o) {
    return;
  }
  if (!match) {
    await bot.sendMessage(CHAT_ID, "Invalid command args.", {
      disable_web_page_preview: true,
    });
    return;
  }
  const sv = match[1].trim().toLowerCase();
  let find = null;
  const index = parseFloat(sv) - 1;
  find = servers[index];

  if (find) {
    servers = servers.filter((s, i) => i !== index);
    fs.writeFileSync(SERVERS_FILE, JSON.stringify(servers), "utf8");
    await bot.sendMessage(
      CHAT_ID,
      `Removed ${find.username}@${find.host}:${find.port} successfully`,
      {
        disable_web_page_preview: true,
        protect_content: true,
      }
    );
  } else {
    await bot.sendMessage(CHAT_ID, `${sv} is not valid`, {
      disable_web_page_preview: true,
      protect_content: true,
    });
  }
});

// SSH
bot.onText(/\/ssh (.+)/, async (msg, match) => {
  const o = await checkOwner(msg);
  if (!o) {
    return;
  }
  if (!match) {
    await bot.sendMessage(CHAT_ID, "Invalid command args.", {
      disable_web_page_preview: true,
    });
    return;
  }

  const sv = match[1].trim().toLowerCase();
  let find = null;
  if (sv.includes("@")) {
    find = servers.find((m) => `${m?.username}@${m?.host}` === sv);
  } else {
    const index = parseFloat(sv) - 1;
    find = servers[index];
  }

  let pathPrivateKey = current?.pathPrivateKey || PATH_PRIVATEKEY;
  let privateKey;

  try {
    privateKey = fs.readFileSync(pathPrivateKey);
  } catch (error) {
    await bot.sendMessage(CHAT_ID, `File not found\n${pathPrivateKey}`, {
      disable_web_page_preview: true,
    });
    return;
  }

  if (find) {
    current = find;
    ssh.connect({
      host: current?.host,
      username: current?.username,
      password: current?.password,
      privateKey: privateKey,
      port: +current?.port || 22,
      passphrase: current?.keyPassword,
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

  await bot.sendMessage(CHAT_ID, `Disconnected from the current server`, {
    disable_web_page_preview: true,
    protect_content: true,
  });
});

bot.on("text", async (msg) => {
  const o = await checkOwner(msg);
  if (!o || isBotCommand(msg)) {
    return;
  }

  if (!current) {
    await bot.sendMessage(
      CHAT_ID,
      `No server connected. Please connect to a server first.`
    );
    return;
  }

  const ping = await bot.sendMessage(CHAT_ID, `Executing...`);

  try {
    if (!msg.text) {
      throw new Error("Command is invalid");
    }
    sshExecute(msg.text.trim(), ping);
  } catch (error) {
    console.log(error);
    await bot.editMessageText(`Error: ${JSON.stringify(error, null, 2)}`, {
      message_id: ping.message_id,
      chat_id: ping.chat.id,
    });
  }
});
