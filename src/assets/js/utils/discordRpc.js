const RPC = require('discord-rpc');
const clientId = '1421823141424005190'; 

RPC.register(clientId);
const rpc = new RPC.Client({ transport: 'ipc' });

function startDiscordRpc() {
    rpc.on('ready', () => {
        rpc.setActivity({
            details: 'Sur Miyura Launcher',
            state: 'Prêt à jouer',
            startTimestamp: Date.now(),
            largeImageKey: 'large', 
            largeImageText: 'Miyura Launcher',
            smallImageKey: 'small', 
            smallImageText: 'Minecraft',
            instance: false,
        });
        console.log(' Discord RPC prêt ');
    });

    rpc.login({ clientId }).catch(console.error);
}

module.exports = { startDiscordRpc };