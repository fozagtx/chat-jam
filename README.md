# Chat Jam

Chat Jam turns a Twitch chat into a band. Viewers add synthesized layers with short commands; the eighth layer triggers The Drop and a Twitch clip request. The overlay is readable with sound muted, and the setup page can render the current song to a WAV plus credits.

## Start in under 10 minutes

1. Clone this repository and run `npm install` (Node.js 22 or newer).
2. If you have a Twitch developer application, put its public Client ID in `src/config.ts` (`TWITCH_CLIENT_ID`). Set its OAuth redirect URL to `http://localhost:3000/callback`. `TWITCH_CLIENT_ID` environment variable can override the source constant.
3. Run `npm start` and open `http://localhost:3000`.
4. Choose **Connect with Twitch** and approve the requested scopes.
5. In OBS, choose **Add → Browser**, set URL to `http://localhost:3000/overlay`, width `1920`, height `1080`, and tick **Control audio via OBS**. Set its level in the Audio Mixer.
6. Create a channel point reward named **Drop the beat** if you want viewers to trigger the Drop early. The reward should be available to your channel.

Chat commands: `!kick`, `!snare`, `!hat`, `!bass 1` through `!bass 4`, `!melody C E G`, and `!vibe spooky pirate`. Moderators and the broadcaster can use `!reset`. Chat Jam does not post chat replies.

`!vibe` is optional. Set `OPENAI_API_KEY` before starting the server to enable moderation and structured pattern generation; without it, the setup and overlay show that the command is off. Twitch credentials are validated by Twitch and held in memory only. There is no database.

## Development

- `npm test` runs Vitest.
- `npm run typecheck` checks TypeScript.
- `npm start` builds and starts the app on port 3000.
