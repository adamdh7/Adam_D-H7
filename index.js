// index.js
// Un bot WhatsApp simple avec Baileys pour tagall et kickall

const {
  default: makeWASocket,
  DisconnectReason,
  useSingleFileAuthState,
  fetchLatestBaileysVersion,
  delay,
} = require("@whiskeysockets/baileys");
const P = require("pino");

const { state, saveState } = useSingleFileAuthState("./auth_info.json");

async function startBot() {
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Baileys version: ${version.join(".")}, latest? ${isLatest}`);

  const sock = makeWASocket({
    logger: P({ level: "silent" }),
    printQRInTerminal: true,
    auth: state,
    version,
  });

  sock.ev.on("creds.update", saveState);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.log("Déconnecté, supprime le fichier auth_info.json et relance.");
        process.exit();
      }
      console.log("Reconnexion...");
      startBot();
    } else if (connection === "open") {
      console.log("Connecté ✅");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
    const isGroup = from.endsWith("@g.us");
    const prefix = "."; // ou charge à partir d'un fichier .env

    if (!text?.startsWith(prefix) || !isGroup) return;

    const [command, ...args] = text.slice(prefix.length).trim().split(/\s+/);

    // TAGALL: Mentionne chaque membre sur une ligne
    if (command === "tagall") {
      try {
        const metadata = await sock.groupMetadata(from);
        const mentions = metadata.participants.map(p => p.id);
        // Construire message avec un utilisateur par ligne
        let message = "📢 *Tag All* 📢\n\n";
        mentions.forEach((m) => {
          message += `@${m.split("@")[0]}\n`;
        });
        await sock.sendMessage(from, {
          text: message,
          mentions
        });
      } catch (err) {
        console.error("Erreur tagall:", err);
        await sock.sendMessage(from, { text: "❌ Impossible de taguer tout le monde." });
      }
    }

    // KICKALL: Expulse tous les membres (sauf l'admin/bot)
    else if (command === "kickall") {
      try {
        const metadata = await sock.groupMetadata(from);
        const botId = sock.user.id.split(":")[0] + "@s.whatsapp.net";

        for (let p of metadata.participants) {
          const pid = p.id;
          // Ne pas expulser le bot ni les admins
          if (p.admin === "superadmin" || p.admin === "admin" || pid === botId) continue;
          try {
            await sock.groupParticipantsUpdate(from, [pid], "remove");
            // Petite pause pour éviter d'être bloqué
            await delay(1000);
          } catch (e) {
            console.warn(`Impossible d'expulser ${pid}:`, e);
          }
        }
        await sock.sendMessage(from, { text: "✅ Tous les membres ont été expulsés." });
      } catch (err) {
        console.error("Erreur kickall:", err);
        await sock.sendMessage(from, { text: "❌ Impossible d'expulser tout le monde." });
      }
    }
  });
}

startBot();
