# Logging Information Discord Bot

This is a Discord bot designed to integrate with a custom website to provide real-time logging, user status updates, and administrative control features.

## Features

-   **Website Status Alerts:** Announce when the website system is online.
-   **User Connection Alerts:** Notify Discord channels when users log in to the website.
-   **User Management Commands:** Administer users via Discord commands (e.g., `.Information`, `.Logout`, `.Zoom Control`, `.Screenshot` for admins).

## Setup

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/your-username/my-discord-logging-bot.git
    cd my-discord-logging-bot
    ```

2.  **Configure Environment Variables (Crucial!):**
    *   **Do NOT directly modify `config.py` with your secrets for deployment.**
    *   **Discord Bot Token:** Go to the [Discord Developer Portal](https://discord.com/developers/applications), create/select your application, go to "Bot," and copy your bot's token. Set this as an environment variable named `DISCORD_TOKEN`.
    *   **Discord Channel IDs:** Enable Discord Developer Mode (User Settings -> Advanced). Right-click your desired channels and "Copy ID." Set `WEBSITE_CHANNEL_ID` and `LOGIN_CHANNEL_ID` environment variables.
    *   **Discord Admin Role ID (Optional):** Right-click on your admin role and "Copy ID." Set `ADMIN_ROLE_ID` environment variable if you want to use the `@is_admin()` decorator.
    *   **Website API URL:** Set `WEBSITE_API_BASE_URL` to the base URL of your *deployed* website's API (e.g., `https://my-awesome-site.com/api`).
    *   **Command Prefix (Optional):** Set `COMMAND_PREFIX` if you want something other than `.`.

    *Local Development with `.env` (Optional but Recommended):*
    For local testing, you can create a `.env` file in your project root (which is ignored by Git) and use `python-dotenv` to load these variables.
    `pip install python-dotenv`
    Add `from dotenv import load_dotenv; load_dotenv()` at the very top of `main.py`.
    Example `.env` content:
    ```
    DISCORD_TOKEN="YOUR_LOCAL_TOKEN_HERE"
    COMMAND_PREFIX="."
    WEBSITE_CHANNEL_ID="YOUR_LOCAL_WEB_CHANNEL_ID"
    # etc.
    ```

3.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Run the Bot (Local Development):**
    ```bash
    python main.py
    ```

## Deployment (e.g., Render.com, DigitalOcean App Platform)

Refer to specific platform documentation for detailed deployment steps. Key points:

*   Push your entire project to a GitHub repository.
*   Connect your repository to your chosen PaaS provider.
*   Configure the service as a `Worker`.
*   Crucially, set all required **Environment Variables** (`DISCORD_TOKEN`, `WEBSITE_CHANNEL_ID`, `WEBSITE_API_BASE_URL`, etc.) in the deployment platform's settings.

## Usage

*   Invite the bot to your Discord server (ensure it has necessary permissions like "Read Messages," "Send Messages," "Embed Links").
*   Use `.<command>` (e.g., `.help`) in a channel the bot can see.
*   Your website's backend needs to be configured to send a message to `WEBSITE_CHANNEL_ID` when online, and `LOGIN_CHANNEL_ID` when a user connects (e.g., via Discord webhooks).
*   Your website's backend must also implement the API endpoints that the Discord bot calls (e.g., `/users/{id}/info`, `/user/logout`, `/user/screenshot`). These endpoints need to handle authentication/authorization appropriately.

## Extending Commands

To add more commands, follow the existing pattern in `main.py`. Each command should typically:
1.  Be an `async` function.
2.  Be decorated with `@bot.command(name='CommandName')`.
3.  Include a `ctx` argument and other arguments for user input (e.g., `user_id: str`).
4.  Interact with your website's API using `await website_send_command()` or `await website_get_data()`.
5.  Send a response back to the Discord channel using `await ctx.send()`.
6.  Update the `help_command` with the new command's description.

---

You've now got all the pieces of your bot code. Good luck building out the website API and getting it deployed!
