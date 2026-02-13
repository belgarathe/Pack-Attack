import {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ButtonBuilder,
    ActionRowBuilder,
    ButtonStyle,
    TextChannel,
    NewsChannel,
    ThreadChannel,
    Events
} from 'discord.js';

let discordClient: Client | null = null;

export function getDiscordClient() {
    if (!discordClient) {
        discordClient = new Client({
            intents: [GatewayIntentBits.Guilds],
        });

        discordClient.once(Events.ClientReady, (client) => {
            console.log(`✅ Discord bot logged in as ${client.user.tag}`);
        });

        discordClient.on(Events.Error, (error) => {
            console.error('❌ Discord client error:', error);
        });

        discordClient.login(process.env.DISCORD_BOT_TOKEN).catch((error) => {
            console.error('❌ Failed to login to Discord:', error);
        });
    }
    return discordClient;
}

interface BattleNotification {
    battleId: string;
    boxName: string;
    boxImageUrl?: string;
    players: number;
    rounds: number;
    winCondition: string;
    privacy: 'PUBLIC' | 'PRIVATE';
    entryCost: number;
    creatorUsername: string;
}

export async function sendBattleNotificationBot(battle: BattleNotification) {
    try {
        const client = getDiscordClient();
        const channelId = process.env.DISCORD_BATTLE_CHANNEL_ID;

        if (!channelId) {
            console.error('⚠️  Discord channel ID not configured');
            return;
        }

        const battleUrl = `${process.env.NEXT_PUBLIC_APP_URL}/battles/${battle.battleId}`;

        const winConditionEmoji: Record<string, string> = {
            'NORMAL': '👑',
            'UPSIDE_DOWN': '🔄',
            'SHARE': '🤝',
            'JACKPOT': '🎰',
        };

        const winConditionNames: Record<string, string> = {
            'NORMAL': 'Highest Wins',
            'UPSIDE_DOWN': 'Lowest Wins',
            'SHARE': 'Share Mode',
            'JACKPOT': 'Jackpot',
        };

        const embed = new EmbedBuilder()
            .setTitle('⚔️ Neues Battle erstellt!')
            .setDescription(`**${battle.creatorUsername}** hat ein neues Battle gestartet!`)
            .setColor(0x8B5CF6) // Purple
            .addFields(
                { name: '📦 Box', value: battle.boxName, inline: true },
                { name: '👥 Spieler', value: `${battle.players} Spieler`, inline: true },
                { name: '🔄 Runden', value: `${battle.rounds}`, inline: true },
                {
                    name: `${winConditionEmoji[battle.winCondition]} Win Condition`,
                    value: winConditionNames[battle.winCondition] || battle.winCondition,
                    inline: true
                },
                { name: '🪙 Entry Cost', value: `${battle.entryCost.toLocaleString()} Coins`, inline: true },
                { name: '🔒 Privacy', value: battle.privacy === 'PUBLIC' ? '🌍 Öffentlich' : '🔐 Privat', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Klicke auf den Button um beizutreten!' });

        if (battle.boxImageUrl) {
            embed.setThumbnail(battle.boxImageUrl);
        }

        const button = new ButtonBuilder()
            .setLabel('🎮 Jetzt beitreten!')
            .setStyle(ButtonStyle.Link)
            .setURL(battleUrl);

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(button);

        // Wait for client to be ready if needed
        if (!client.isReady()) {
            console.log('⏳ Discord client not ready, waiting...');
            await new Promise((resolve) => {
                client.once(Events.ClientReady, resolve);
                // Timeout after 10 seconds
                setTimeout(resolve, 10000);
            });
        }

        const channel = await client.channels.fetch(channelId);

        if (!channel) {
            console.error('❌ Channel not found');
            return;
        }

        if (channel instanceof TextChannel ||
            channel instanceof NewsChannel ||
            channel instanceof ThreadChannel) {
            await channel.send({
                embeds: [embed],
                components: [row],
            });
            console.log('✅ Battle notification sent to Discord!');
        } else {
            console.error('❌ Channel is not a text-based channel');
        }
    } catch (error) {
        console.error('❌ Error sending Discord notification:', error);
        throw error;
    }
}