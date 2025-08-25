// src/utils/discordWebhookSender.js
const fetch = require('node-fetch'); // Or use native fetch if Node.js 18+

const EMBED_FIELD_LIMIT = 25; // Discord API limit for fields per embed

// Helper function to chunk fields into multiple embeds
function createEmbedsFromFields(title, color, fields, description = null) {
    const embeds = [];
    for (let i = 0; i < fields.length; i += EMBED_FIELD_LIMIT) {
        const chunk = fields.slice(i, i + EMBED_FIELD_LIMIT);
        embeds.push({
            title: i === 0 ? title : `${title} (Part ${Math.floor(i / EMBED_FIELD_LIMIT) + 1})`,
            description: i === 0 ? description : null,
            color: color,
            fields: chunk
        });
    }
    if (embeds.length === 0) { // Ensure at least one empty embed if no fields
        embeds.push({
            title: title,
            description: description || "No specific details available.",
            color: color
        });
    }
    return embeds;
}

// Function to send data to Discord webhook (Backend version - SECURE)
async function sendWebhook(url, embeds, username = "Backend Logger") {
    if (!url) {
        console.error("Webhook URL is undefined for sending embeds:", embeds);
        return;
    }

    const finalEmbeds = embeds.map(embed => ({
        ...embed,
        timestamp: embed.timestamp || new Date().toISOString(),
        footer: {
            text: `${username} | Node.js Server`
        }
    }));

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ embeds: finalEmbeds }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Discord API error: ${response.status} - ${errorText}`);
        }
        console.log(`Webhook sent successfully to ${url} with ${finalEmbeds.length} embed(s).`);
    } catch (error) {
        console.error('Error sending webhook from backend:', error);
    }
}

module.exports = {
    sendWebhook,
    createEmbedsFromFields
};
