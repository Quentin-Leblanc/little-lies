/**
 * External community links.
 *
 * Voice chat is deliberately NOT built into the game — Among Liars is a
 * talking game, and rather than shipping a WebRTC stack we send players
 * to the community Discord and let them use a real voice client. The
 * link is surfaced in the TopBar (reachable from every screen, including
 * mid-game) and as a call-to-action in the lobby next to the room code.
 *
 * The invite must be created as a **never-expiring, unlimited-use** link
 * in Discord (Server Settings → Invites), otherwise it silently rots and
 * every player hits "Invite Invalid".
 */
export const DISCORD_INVITE_URL = 'https://discord.gg/8DQvMj973';

/** True when a community Discord is configured — lets the UI hide the
 *  affordance entirely rather than render a dead button. */
export const hasDiscord = () => Boolean(DISCORD_INVITE_URL);
