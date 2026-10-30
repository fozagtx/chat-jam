# Chat Jam: research and stronger PRD (v2)

## 1. What I found

### The hackathon page and rules (twitchcon-codex.devpost.com)

- **Deadline:** Nov 2, 2026, 2:00 PM Pacific (22:00 GMT). A saved draft does not count; you must click Submit.
- **Judging happens in two stages.** Stage 1 is pass/fail ("does it fit the theme and use the required tools"). Stage 2 scores four equally weighted criteria: **Innovation, Impact, Technical implementation (including how well it uses Codex), Design (easy to use, fun to watch)**. The top 5 become finalists.
- **Ties are broken by Innovation first.** Being different matters more than anything else.
- **Judges don't have to run the project** and may judge only from the video, the text and the images. The rules also allow "automated AI-driven analysis" in judging. So the video and the written description must spell out each criterion clearly.
- **Video:** under 3 minutes, must show it working on Twitch **and** show it being built in Codex. No copyrighted music or third-party trademarks, so don't show a commercial game behind the overlay. An unlisted YouTube video is fine.
- **Codex:** the free plan is OK, but it has usage limits, so keep headroom for final fixes. Submit the session ID of the main thread (`/status`).
- **Twitch notes from the FAQ and docs:** Extensions take 5–14 days to review, so we don't use one. Twitch has **paused chatbot verification reviews**. That's another reason not to depend on a bot posting in chat. Our "no chat replies" rule fits this.
- **Don't change the repo or video after the deadline** until winners are announced.

### Competition already submitted to this hackathon

Two submissions in this hackathon's gallery are close to Chat Jam as it is written today:

| Project                                                 | What it does                                                                                                                                                       | What it lacks                                                                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| [Pulse Choir](https://devpost.com/software/pulse-choir) | `!pulse 1`–`!pulse 7` notes and `!pulse clap`, locked to the streamer's tempo, key and scale, on a shared beat; OBS visualizer; accessibility companion            | No drums or bass layers, no goal or game, no AI ("no runtime AI"), nothing for hype events, no song you can keep |
| [ChatChorus](https://devpost.com/software/chatchorus)   | Every chat message nudges generative music and reactive visuals; mood, timbre and scene controls; deployed on Cloudflare with a demo that works without logging in | Viewers don't knowingly build anything, there's no credit for who added what, no structure, no payoff moment     |

The same idea also shows up outside this hackathon: [Music Maker](https://devpost.com/software/music-maker-4n5etl) (2018, an on-screen sequencer for chat, did not win) and a few small GitHub "Twitch Plays Music" repos.

**Verdict:** Chat Jam v1 as written is basically Pulse Choir plus drums. It would lose the Innovation tie-breaker. The core works; what it needs is a **goal, a payoff moment and a reason to keep the result.**

### Past Twitch contests on Devpost (full search, all 48 results checked)

Searching "twitch" on devpost.com/hackathons returns 48 hackathons. I opened every one. 8 are Twitch's own contests (TwitchCon 2017, 2018 and 2019, AWS Extensions Challenge, Dev Jam 2019, Channel Points 2021, Streamer Tools 2024, Hackalong 2018). Another 6 had Twitch prizes or were about streaming or esports:

- Capitol360 2018, which had a Twitch Challenge on music + AR
- ESA Foundation Twitch Hackathon 2019, which never announced winners
- GRID Esports DataJam 2023
- Liquid Hacks 1, 2 and 3 (Team Liquid)
- TokBox Live Video
- TVnext

The other ~34 only mention Twitch because they streamed their opening ceremony on it.

Winners that matter for Chat Jam:

| Winner                                                                                                                                                                                 | Contest / prize                             | What it was                                              | Lesson for Chat Jam                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [Rhythm Party](https://devpost.com/software/song-runner)                                                                                                                               | Capitol360, **Twitch Challenge** winner     | "Party game where everyone can play along to the music"  | The one Twitch prize a music project won went to music made into a **game**, not a free-form toy. That's why The Drop and the band are in v2. |
| [BeyondTwitch](https://devpost.com/software/beyondtwitch)                                                                                                                              | Capitol360, TiVo prize                      | AR effects for musicians' streams, controlled by a glove | Music streams are a real niche the judges like.                                                                                               |
| [LiquidOverlay](https://devpost.com/software/liquidoverlay)                                                                                                                            | Liquid Hacks 2, **1st place**               | Overlay helping deaf and hard-of-hearing gamers          | Accessibility keeps placing top: Chatter 2nd, Big-Con, and the Blind Accessibility Mode for Street Fighter III.                               |
| [LiquidTube](https://devpost.com/software/liquidtube)                                                                                                                                  | Liquid Hacks 3, 3rd                         | Auto-collects Twitch clips of players                    | Clips made automatically are valued. Supports auto Create Clip.                                                                               |
| [flank.bet](https://devpost.com/software/flank-bet), [GX EsportPredict](https://devpost.com/software/gx-esportpredict), [HypeMarket](https://devpost.com/software/massive-data-center) | GRID DataJam 2nd/3rd, other recent wins     | Viewers predict small live moments                       | Viewers want to _act_, not watch.                                                                                                             |
| [CD Blocker](https://devpost.com/software/cd-blocker)                                                                                                                                  | Recent Twitch-tagged winner                 | AI blurs credit cards shown on stream                    | Stream-safety tools win. Supports our copyright-safe angle.                                                                                   |
| [GitBattle](https://devpost.com/software/gitbattle)                                                                                                                                    | Hackalong, "bring a community closer" prize | Community contests                                       | Community competition is rewarded.                                                                                                            |

Plus the 52 winners of Twitch's own 7 contests (listed in the ideas doc). They mostly reward:

- chat changing the streamer's real thing (11 winners)
- viewers seeing _themselves_ on screen (Duelers, Boomers, PixelWars, Chat Heroes)
- game shows (OK Gamers grand prize)
- hype events (Ride the Hype Train, Summon TV)
- collabs (Stream Together Timeline)
- things to keep (ClipsOverlay grand prize, SubClip)

**Takeaway:** turn the jam into a game with a goal (The Drop), put every viewer on screen as a band member, react to hype events, clip the climax automatically, make it work for viewers who can't hear it, and send the streamer home with a song they own.

### Technical facts that change the original PRD

- **OBS plays browser-source audio without a click.** OBS's browser plugin launches with `autoplay-policy=no-user-gesture-required` (confirmed in the obs-browser source code). The "Click to start audio" button is only needed in a normal browser tab, so show it only when the audio is actually blocked. Nobody can easily click inside an OBS source.
- **Twitch's own Example Chatbot uses EventSub WebSockets** (`wss://eventsub.wss.twitch.tv/ws`) with the `user:read:chat` scope. That's the officially supported path, and the judges are from Twitch.
- **A stranger can be running in under 10 minutes without making a token by hand.** Put the app's _public_ Twitch Client ID in the code and use a "Connect with Twitch" button (OAuth implicit flow redirecting to `http://localhost:3000/callback`). Nobody needs a client secret, the Twitch CLI or a token generator site.

---

## 2. What changes (ranked, all fit in the time left)

| #             | Change                                                                                                                                                                                                                                                                                                                 | Why it wins points                                                                                                               |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1             | **The Drop:** when chat fills all 8 layers, the song plays a 4-bar build-up and then a **drop** with a full-screen moment showing every contributor's name. The app calls Twitch **Create Clip** right after it.                                                                                                       | Innovation and fun to watch: a climax chat works toward, plus a ready-made clip. Neither competitor has it.                      |
| 2             | **The band:** each layer is a band-member tile in the viewer's own Twitch chat colour, showing their name and instrument. The person who added the most layers is "band leader".                                                                                                                                       | Viewers on screen is the pattern that won most often in the past.                                                                |
| 3             | **Hype events play music:** a raid adds a big "raid anthem" fill and shows the raiding channel's name; a new sub gets a solo bar under their name; Bits trigger a drum fill; a channel-point reward "Drop the beat" forces The Drop early.                                                                             | Ties the music to things streamers already celebrate, and uses EventSub beyond chat.                                             |
| 4             | **Key lock:** bass and melody always snap to the streamer's key and scale, so it always sounds good. `!melody C E G` still works, and wrong notes snap to the nearest note in the scale.                                                                                                                               | Meets "5+ viewers and it still sounds good". Matches Pulse Choir on quality.                                                     |
| 5             | **Song of the stream:** a "Download tonight's song" button on the setup page renders the loop to a WAV file with a credits text listing everyone who added a layer. The streamer can use it as a copyright-free intro or background track.                                                                             | Impact: streamers have real DMCA music headaches, and this is their community's own music. Not a database; just a file download. |
| 6             | **`!vibe <words>` (AI):** `!vibe spooky pirate` → an OpenAI model with structured output returns one layer (instrument, 16 steps, scale degrees). It plays in key on the next bar. Max 1 per viewer per 30 s. It's optional: without `OPENAI_API_KEY` the overlay says the command is off instead of failing silently. | Lets casual viewers join without learning note syntax. A runtime AI job Pulse Choir doesn't have.                                |
| 7             | **Watch it without sound:** every sound has its own visual cue (each tile pulses on its hits, bass glows, melody shows the note names), plus a "song captions" line such as "♪ kick + bass 2 + melody by …". No fast full-screen flashes (kept under 3 flashes per second, with a reduced-motion setting).             | Accessibility placed top at Liquid Hacks. Deaf viewers and people watching muted can still follow. Low cost.                     |
| 8 _(stretch)_ | **Jam Battle in Shared Chat:** when two channels share chat, each community fills its own half of the grid (coloured by source channel), then a Twitch Poll decides whose loop wins The Drop.                                                                                                                          | Collab category, and a new Twitch feature no past winner has used. Only if days 1–3 finish early.                                |

Kept from v1: every command, the 8-layer cap, the 5 s per-viewer limit, no chat replies, no copyrighted sounds, beat-perfect timing, volume limiter, and nothing in the "Not in version 1" list.

---

## 3. Chat Jam: PRD v2

### What it is

Chat Jam lets a Twitch chat build a song together, live. Viewers type short commands. Each command adds a sound to a looping beat and puts the viewer on screen as a member of the band. When the band is full, the song **drops**, the moment gets clipped, and at the end of the stream the streamer can download the song as a copyright-free track.

### Who it is for

- Streamers who want chat to be part of the show, in any kind of stream, and who want a song of their own.
- Viewers who want to do more than type messages, and want to see their name in the band.

### The problem it solves

Chat is usually just text, and streamers have to be careful with music because of copyright. Chat Jam gives viewers a fun way to make something together that everyone can hear and see, and the result is music the streamer is free to use.

### How it is built (simple version)

- **One small Node.js app** that you start with `npm start` on the streamer's computer.
- **Setup page** at `http://localhost:3000`: a "Connect with Twitch" button, the key and tempo, a volume slider, a "Download tonight's song" button, and a status line showing connected, live, number of layers and last command.
- **Overlay page** at `http://localhost:3000/overlay`, added to OBS as a browser source. It plays the music with the Web Audio API and draws the band and the grid.
- The app listens to Twitch with **EventSub WebSockets** and sends each accepted command to the overlay over a local WebSocket.
- **The Twitch token stays inside the app and never goes into the OBS URL.**

### What must work (must haves)

1. **Connect with Twitch** in one click (OAuth implicit flow, public Client ID in the code, redirect `http://localhost:3000/callback`). Scopes: `user:read:chat`, `clips:edit`, `channel:read:subscriptions`, `bits:read`, `channel:read:redemptions`.
2. The app reads the chat of the connected channel in real time (`channel.chat.message`).
3. **Commands:**
   - `!kick`, `!snare`, `!hat`: drum layers
   - `!bass 1` to `!bass 4`: four bass lines, always in key
   - `!melody C E G`: a short tune from up to 8 notes, snapped to the song's key and scale
   - `!vibe <words>`: AI writes one layer from a description (works only when `OPENAI_API_KEY` is set; otherwise the overlay shows "!vibe is off")
   - `!reset`: clears the song (streamer and moderators only, checked from the chat message badges)
4. **All layers loop together in perfect time.** Use a Web Audio look-ahead scheduler. New drum layers start on the next beat; bass, melody and vibe layers start on the next bar.
5. **The overlay shows:**
   - the 16-step grid lighting up on each beat
   - the band: one tile per layer with the viewer's name in their Twitch chat colour and the instrument icon
   - a big, readable style that works at 1080p and 720p, on a transparent background
   - a visual cue for every sound and a one-line song caption, so it works muted; no more than 3 flashes per second, with a reduced-motion option
6. **Max 8 layers.** When full, the next added layer replaces the oldest one, and **the first time it fills, The Drop happens**: a 4-bar build-up (riser plus filter sweep), the drop, a full-screen "Made by" credits moment, and a **Create Clip** call. If the stream is offline, Twitch won't make a clip; the overlay just skips that step.
7. **Hype events:**
   - `channel.raid`: raid anthem fill plus "Raid from <channel>!"
   - `channel.subscribe`: a 1-bar solo with the subscriber's name
   - `channel.cheer`: a drum fill
   - a channel-point reward the streamer creates, called "Drop the beat": `channel.channel_points_custom_reward_redemption.add` → triggers The Drop now
8. **Download tonight's song:** renders the current loop (4 times through, with the drop) to a WAV with `OfflineAudioContext`, plus a `credits.txt` listing every contributor.

### Rules to stop chaos

- Each viewer can add one sound every 5 seconds, and one `!vibe` every 30 seconds.
- Unknown commands and bad notes are ignored quietly.
- The bot never replies in chat. All feedback is on the overlay (e.g. a small "slow down" badge next to the viewer's tile).
- `!vibe` text goes through the OpenAI moderation endpoint first and is never shown on screen; only the resulting layer plays.

### Stream safety and sound quality (must haves)

1. **No copyrighted music.** Every sound is synthesized in code (oscillators, noise and envelopes). There are no samples at all.
2. **Perfect timing.** Everything is scheduled on the audio clock, never on `setTimeout`, so a late command waits for the next beat or bar.
3. **Sound works in OBS.** OBS browser sources allow audio without a click, so the overlay starts by itself. The "Click to start audio" button appears **only** if the browser blocked audio (a normal tab). The README shows the OBS steps: Add → Browser → URL `http://localhost:3000/overlay` → 1920×1080 → tick **Control audio via OBS** → set the level in the Audio Mixer.
4. **Volume safety.** Master gain at −6 dB going into a limiter (a `DynamicsCompressorNode` with a hard ratio). The level stays the same with 1 layer or 8.
5. **Setup works for others in under 10 minutes:** `git clone` → `npm install` → `npm start` → open `localhost:3000` → Connect with Twitch → add the OBS source. No token copying, no client secret. `OPENAI_API_KEY` is the only optional setting.

### Nice to have (only if time allows)

- Emotes in chat trigger a drum hit.
- **Jam Battle in Shared Chat** (see change 8 above).
- Tempo slider on the setup page.

### Not in version 1

- No accounts beyond Connect with Twitch, no database, no server in the cloud.
- No saving songs between streams (the download button covers keeping one).
- No multiple channels at once, except the Shared Chat stretch goal.

### How we know it is done

- A real viewer types `!kick` in a real live channel and hears it in OBS within 1–2 seconds.
- 5 or more different viewers add layers, and it still sounds good and stays in time at 8 layers.
- Filling the band triggers The Drop, and a real clip appears on the channel.
- A raid, a sub or a channel-point "Drop the beat" each audibly changes the song.
- `!reset` works for mods and is ignored for regular viewers.
- `!vibe lofi rain` adds an in-key layer, and with no API key the overlay says it's off.
- "Download tonight's song" gives a WAV that plays in any player, plus the credits file.
- A stranger runs it from the README on a fresh computer in under 10 minutes.
- A live test with 3–5 real viewers in a real channel is done before recording.

### Demo video (under 3 minutes)

1. **0:00–0:15:** the hook. "Twitch chat just made this song." Play the drop with the credits on screen.
2. **0:15–0:35:** the problem: chat is just text, and music is a copyright risk for streamers.
3. **0:35–1:40:** live on a real channel. Viewers type `!kick`, `!bass 2`, `!melody`, `!vibe`, and the band fills up. A raid arrives and the anthem plays. A channel-point "Drop the beat" fires The Drop, and the clip appears.
4. **1:40–2:10:** download tonight's song and play it as the stream intro.
5. **2:10–2:50:** how Codex built it: the main Codex thread, the scheduler and EventSub code it wrote, and the tests running.
6. **2:50–3:00:** a closing line plus the repo URL.

The music in the video is Chat Jam's own output, so it's safe under the rules. Use a "Just Chatting" scene with no commercial game footage.

### Plan (4 days left)

- **Today:** Codex thread started and session ID saved. Connect with Twitch working, EventSub chat arriving, `!kick` plays in OBS.
- **Day 2:** all drums, bass and melody with key lock and the scheduler; grid and band tiles; rate limits; `!reset`.
- **Day 3:** The Drop plus Create Clip, hype events, channel-point reward, limiter, Download tonight's song, `!vibe`.
- **Day 4 (Nov 1):** live test with 3–5 friends, polish the look, README, fresh-computer setup test, record the video.
- **Nov 2 morning:** upload to YouTube (unlisted is fine), write the description mapped to each judging criterion, **click Submit** well before 22:00 GMT. Don't touch the repo after.

### Description template (for human and AI judges)

- **Innovation:** chat builds a song with a goal: fill the band, trigger The Drop, get a clip and a copyright-free song.
- **Impact:** any stream type; viewers star in the band; the streamer leaves with their own music.
- **Technical:** EventSub WebSockets, Create Clip, channel points, raids, subs and Bits; an audio-clock scheduler; key lock; a limiter; offline rendering; an AI `!vibe` with moderation. Built in one Codex thread (session ID included).
- **Design:** one click to connect, one OBS source, large readable tiles, no chat spam.

---

## 4. Codex kickoff prompt (paste into the main Codex thread)

```
Build "Chat Jam", a Node.js 22 + TypeScript app that lets a Twitch chat build a looping song live.

Layout: one server (Express + ws) on port 3000.
- GET /           setup page: "Connect with Twitch" (OAuth implicit flow, response_type=token,
                  public CLIENT_ID constant in src/config.ts, redirect http://localhost:3000/callback,
                  scopes user:read:chat clips:edit channel:read:subscriptions bits:read channel:read:redemptions),
                  key/scale select, tempo (default 100 BPM), volume, "Download tonight's song", status line.
- GET /callback   reads the token from the URL fragment, POSTs it to /api/token, server validates it
                  with https://id.twitch.tv/oauth2/validate and keeps it in memory (never in the overlay URL).
- GET /overlay    OBS browser source, transparent background, 1920x1080.
- WS  /live       server -> overlay events.

Twitch: connect to wss://eventsub.wss.twitch.tv/ws, on session_welcome create subscriptions via
POST https://api.twitch.tv/helix/eventsub/subscriptions (transport websocket) for channel.chat.message,
channel.raid (to_broadcaster_user_id), channel.subscribe, channel.cheer,
channel.channel_points_custom_reward_redemption.add. Handle session_keepalive and session_reconnect.
Create Clip: POST https://api.twitch.tv/helix/clips?broadcaster_id=... after The Drop; ignore offline errors.

Commands (parse in the server, rate limit 1 per user per 5 s, !vibe 1 per 30 s, ignore unknown):
!kick !snare !hat | !bass 1..4 | !melody <up to 8 notes A-G with optional #/b> snapped to key |
!vibe <text> -> OpenAI Responses API with a JSON schema {instrument, steps[16], degrees[16]},
moderation first; disabled with an on-screen notice if OPENAI_API_KEY is missing |
!reset only if badges include broadcaster or moderator. Never send chat messages.

Audio (overlay, Web Audio API, all sounds synthesized, no samples): look-ahead scheduler on
AudioContext.currentTime (25 ms timer, 100 ms window), 16 steps per bar. Drums start next beat,
pitched layers next bar. Max 8 layers, oldest replaced. First time 8 layers -> The Drop:
4-bar riser + filter sweep, drop, full-screen "Made by" credits, then server calls Create Clip.
Hype: raid = anthem fill + channel name, sub = 1-bar solo, cheer = drum fill, reward "Drop the beat" = Drop now.
Master gain -6 dB into DynamicsCompressorNode limiter. Show "Click to start audio" only if
AudioContext.state is "suspended" after load (OBS autoplays).

Overlay UI: 16-step grid, one band tile per layer (viewer name in their chat colour from the event,
instrument icon), band leader badge, small "slow down" badge on rate limit. Large type, readable at 720p.

Download: setup page re-renders the current pattern 4 loops + drop with OfflineAudioContext to WAV,
plus credits.txt of contributors.

Tests (vitest): command parser, rate limiter, key snapping, layer cap, scheduler step timing.
README: clone -> npm install -> npm start -> Connect with Twitch -> OBS steps (Control audio via OBS),
under 10 minutes. No database, no cloud deploy.
Build in this order: auth + EventSub + !kick in OBS; drums/bass/melody + grid; Drop + hype events;
download; !vibe; README.
```
