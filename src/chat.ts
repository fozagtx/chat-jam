import {
  noteForDegree,
  parseCommand,
  RateLimiter,
  snapNote,
  type Layer,
} from './music.js';
import { isModeratorOrBroadcaster, Song } from './song.js';
import { createVibeLayer } from './vibe.js';
import { clipFailureNotice, createClip } from './twitch/helix.js';
import type { ConnectedAccount } from './twitch/oauth.js';

interface ChatJamOptions {
  song: Song;
  clientId: string;
  broadcast(event: Record<string, unknown>): void;
  getAccount(): ConnectedAccount | null;
}

interface TwitchEvent {
  message?: { text?: string };
  chatter_user_id?: string;
  chatter_user_name?: string;
  badges?: Array<{ set_id?: string }>;
  color?: string;
  from_broadcaster_user_name?: string;
  user_name?: string;
  bits?: number;
  reward?: { title?: string };
}

export class ChatJam {
  private readonly rateLimiter = new RateLimiter();

  constructor(private readonly options: ChatJamOptions) {}

  onNotification = (payload: unknown, subscriptionType: string): void => {
    const event = payload as TwitchEvent;
    if (subscriptionType === 'channel.chat.message') {
      void this.handleChatMessage(event);
    } else if (subscriptionType === 'channel.raid') {
      this.options.broadcast({
        type: 'hype',
        kind: 'raid',
        name: event.from_broadcaster_user_name,
      });
    } else if (subscriptionType === 'channel.subscribe') {
      this.options.broadcast({ type: 'hype', kind: 'sub', name: event.user_name });
    } else if (subscriptionType === 'channel.cheer') {
      this.options.broadcast({
        type: 'hype',
        kind: 'cheer',
        name: event.user_name,
        bits: event.bits,
      });
    } else if (
      subscriptionType === 'channel.channel_points_custom_reward_redemption.add' &&
      String(event.reward?.title).toLowerCase() === 'drop the beat'
    ) {
      this.startDrop();
    }
  };

  private async handleChatMessage(event: TwitchEvent): Promise<void> {
    const message = parseCommand(event.message?.text ?? '');
    if (!message) return;

    const userId = String(event.chatter_user_id ?? '');
    const userName = String(event.chatter_user_name ?? 'viewer');
    const badges = Array.isArray(event.badges) ? event.badges : [];

    if (message.kind === 'reset') {
      if (!isModeratorOrBroadcaster(badges)) return;
      const layers = this.options.song.reset();
      this.options.broadcast({ type: 'reset', layers });
      return;
    }

    const now = Date.now();
    if (!this.rateLimiter.allow(userId, now)) {
      this.options.broadcast({ type: 'slowdown', userId, userName });
      return;
    }
    if (message.kind === 'vibe') {
      if (!this.rateLimiter.allow(userId, now, true)) {
        this.options.broadcast({ type: 'slowdown', userId, userName });
        return;
      }
      await this.addVibe(message.text, event, userId, userName);
      return;
    }

    const settings = this.options.song.settings;
    const layer: Layer = {
      id: crypto.randomUUID(),
      userId,
      userName,
      color: event.color || '#9b59ff',
      instrument: message.instrument,
      steps: message.pattern,
      notes:
        message.notes?.map(
          (note) => `${snapNote(note, settings.key, settings.scale)}4`,
        ) ??
        (message.instrument === 'bass'
          ? message.pattern.map((_, index) =>
              noteForDegree(settings.key, settings.scale, index, 2),
            )
          : undefined),
      createdAt: now,
    };
    this.addLayer(layer);
  }

  private async addVibe(
    text: string,
    event: TwitchEvent,
    userId: string,
    userName: string,
  ): Promise<void> {
    const settings = this.options.song.settings;
    try {
      const result = await createVibeLayer(
        text,
        userId,
        userName,
        event.color || '#9b59ff',
        settings.key,
        settings.scale,
      );
      if (result && 'disabled' in result) {
        this.options.broadcast({
          type: 'notice',
          text: '!vibe is off — OPENAI_API_KEY is not set',
        });
      } else if (result) {
        this.addLayer(result.layer);
      }
    } catch {
      this.options.broadcast({ type: 'notice', text: '!vibe could not create a layer' });
    }
  }

  private addLayer(layer: Layer): void {
    const { layers, firstFull } = this.options.song.add(layer);
    this.options.broadcast({ type: 'layer', layer, layers });
    if (firstFull) this.startDrop();
  }

  private startDrop(): void {
    const { layers, contributors, settings } = this.options.song;
    this.options.broadcast({ type: 'drop', layers, contributors, tempo: settings.tempo });
    const clipDelay = (16 * 60 * 1_000) / settings.tempo;
    setTimeout(() => {
      const account = this.options.getAccount();
      if (!account) {
        this.options.broadcast({ type: 'notice', text: 'Clip failed' });
        return;
      }
      void createClip(
        { clientId: this.options.clientId, accessToken: account.accessToken },
        account.user_id,
      )
        .then((clip) => {
          const editUrl = clip.data[0]?.edit_url;
          this.options.broadcast({
            type: 'notice',
            text: 'Clip saved',
            ...(editUrl ? { url: editUrl } : {}),
          });
        })
        .catch((error: unknown) => {
          this.options.broadcast({ type: 'notice', text: clipFailureNotice(error) });
        });
    }, clipDelay);
  }
}
