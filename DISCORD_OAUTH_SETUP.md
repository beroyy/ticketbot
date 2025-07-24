# Discord OAuth Setup Guide

## Discord Application Configuration

To properly configure Discord OAuth for TicketsBot, you need to add the correct redirect URIs in your Discord application settings.

### Redirect URIs

Add these redirect URIs to your Discord application at https://discord.com/developers/applications:

1. **Development:**
   ```
   http://localhost:4001/auth/callback/discord
   ```

2. **Production (Render.com):**
   ```
   https://ticketsbot-5t9c.onrender.com/auth/callback/discord
   ```
   Or based on your actual API URL:
   ```
   https://[your-api-subdomain].onrender.com/auth/callback/discord
   ```

### Required OAuth2 Scopes

The application requests these scopes:
- `identify` - Basic user information
- `email` - User's email address
- `guilds` - List of user's Discord servers (needed for guild ownership detection)

### Environment Variables

Ensure these are set in your environment:

```env
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
```

### Common Issues

1. **"Invalid oauth2 redirect_uri" error:**
   - Ensure the redirect URI in Discord app settings exactly matches your API URL
   - Check for trailing slashes - they must match exactly
   - Verify you're using the correct environment (dev vs production)

2. **Scope parameter issues:**
   - The auth system now properly formats scopes as an array
   - This prevents malformed scope parameters in OAuth URLs

3. **State mismatch errors:**
   - Clear cookies and local storage
   - Ensure your API_URL and WEB_URL environment variables are correct
   - Check that cookies are not being blocked by browser settings