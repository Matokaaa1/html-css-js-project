const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason
} = require("@whiskeysockets/baileys");

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');

    const sock = makeWASocket({
        auth: state
    });

    sock.ev.on('creds.update', saveCreds);

    // ✅ Show QR code manually
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n📷 Scan this QR code in WhatsApp:\n');
            require('qrcode-terminal').generate(qr, { small: true });
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason === DisconnectReason.loggedOut) {
                console.log('❌ Logged out. Scan QR again.');
                startBot(); // restart to get new QR
            } else {
                console.log('🔄 Connection closed. Reconnecting...');
                startBot();
            }
        } else if (connection === 'open') {
            console.log('✅ Connected to WhatsApp!');
        }
    });

    // Handle incoming messages
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        const sender = msg.key.remoteJid;

        if (text?.toLowerCase() === 'hi') {
            await sock.sendMessage(sender, { text: "Hello! I'm your WhatsApp bot 🤖" });
        } else {
            await sock.sendMessage(sender, { text: `You said: ${text}` });
        }
    });
}
conn.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
        if (!update.message && update.key?.remoteJid && update.key?.id) {
            try {
                const deletedMsg = await conn.loadMessage(update.key.remoteJid, update.key.id);
                if (deletedMsg) {
                    const sender = deletedMsg.key.participant || deletedMsg.key.remoteJid;
                    const messageType = Object.keys(deletedMsg.message)[0];
                    let content = '';

                    switch (messageType) {
                        case 'conversation':
                            content = deletedMsg.message.conversation;
                            break;
                        case 'extendedTextMessage':
                            content = deletedMsg.message.extendedTextMessage.text;
                            break;
                        default:
                            content = `⚠️ Deleted a message of type: ${messageType}`;
                    }

                    await conn.sendMessage(update.key.remoteJid, {
                        text: `🛑 *Anti-Delete Alert*\n@${sender.split('@')[0]} deleted:\n\n${content}`,
                        mentions: [sender]
                    });
                }
            } catch (e) {
                console.error('⚠️ Could not recover deleted message:', e);
            }
        }
    }
});


startBot();
