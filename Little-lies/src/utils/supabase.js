import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Supabase is optional — game works without it (guest mode)
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = () => !!supabase;

// --- Auth helpers ---

export const signUpWithEmail = async (email, password, username) => {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  return { data, error };
};

export const signInWithEmail = async (email, password) => {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
};

export const signInWithOAuth = async (provider) => {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  });
  return { data, error };
};

export const signOut = async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
};

// Send a password-reset email. Supabase emails the user a magic link
// that opens our app on the recovery route — there the user picks a new
// password via supabase.auth.updateUser({ password }). We point the
// link back to the app origin (Supabase appends the recovery token in
// the URL hash) so we don't have to host a dedicated reset page.
export const sendPasswordReset = async (email) => {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  return { data, error };
};

export const getSession = async () => {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

export const getUser = async () => {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// --- Profile helpers ---

export const getProfile = async (userId) => {
  if (!supabase) return null;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data;
};

export const updateProfile = async (userId, updates) => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  return { data, error };
};

// --- XP helpers ---

// Supabase's fluent builders NEVER throw — they resolve with `{ data, error }`.
// The old addXP silently continued after a failed insert or update, which is
// why XP could appear on the GameOver panel but never land in `profiles`.
// We now check each step and surface Postgres / RLS errors to the caller.
export const addXP = async (userId, amount, reason, gameId = null) => {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  if (!userId) return { error: { message: 'Missing userId' } };
  if (!amount || amount <= 0) return { error: { message: 'Amount must be positive' } };

  const { error: logError } = await supabase.from('xp_log').insert({
    user_id: userId,
    amount,
    reason,
    game_id: gameId,
  });
  if (logError) {
    // eslint-disable-next-line no-console
    console.error('[addXP] xp_log insert failed', logError);
    return { error: logError };
  }

  const profile = await getProfile(userId);
  if (!profile) {
    // Profile should exist (auto-created by handle_new_user trigger on signup).
    // If it doesn't, the trigger never ran for this account — bail loudly.
    const err = { message: 'Profile not found for user ' + userId };
    // eslint-disable-next-line no-console
    console.error('[addXP]', err.message);
    return { error: err };
  }

  const newXP = (profile.xp || 0) + amount;
  const newLevel = Math.floor(newXP / 100) + 1;

  const { data, error } = await updateProfile(userId, { xp: newXP, level: newLevel });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[addXP] profiles update failed', error);
    return { error };
  }
  return { data, newXP, newLevel };
};

export const incrementGamesPlayed = async (userId, won = false) => {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  if (!userId) return { error: { message: 'Missing userId' } };
  const profile = await getProfile(userId);
  if (!profile) return { error: { message: 'Profile not found' } };

  const updates = { games_played: (profile.games_played || 0) + 1 };
  if (won) updates.games_won = (profile.games_won || 0) + 1;

  const { data, error } = await updateProfile(userId, updates);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[incrementGamesPlayed] update failed', error);
    return { error };
  }
  return { data };
};

// --- Game history ---

export const saveGameHistory = async (gameData) => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('game_history')
    .insert(gameData)
    .select()
    .single();
  return { data, error };
};

// --- Admin check ---

export const isAdmin = async (userId) => {
  if (!supabase) return false;
  const profile = await getProfile(userId);
  return profile?.is_admin === true;
};

// --- Post-game survey ---

// Submits a survey response to the `surveys` table. user_id is optional —
// guests can leave feedback anonymously. Returns { error } for UI handling.
export const submitSurvey = async ({ userId = null, rating, comment, answers, context }) => {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const payload = {
    user_id: userId,
    rating: rating ?? null,
    comment: comment ? String(comment).slice(0, 500) : null,
    answers: answers || null,
    game_length_days: context?.days ?? null,
    player_count: context?.playerCount ?? null,
    winning_team: context?.winningTeam ?? null,
    language: context?.language ?? null,
  };
  const { error } = await supabase.from('surveys').insert(payload);
  return { error };
};

// --- Avatar (profile picture) ---

const AVATAR_BUCKET = 'avatars';
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB hard cap
const ALLOWED_AVATAR_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

// Uploads a File/Blob to the `avatars` bucket under `<userId>/avatar.<ext>`,
// overwriting any previous avatar for that user. Returns { url, error }.
// Expects the bucket to exist and be marked public; the RLS policy on
// storage.objects must allow authenticated users to INSERT/UPDATE rows
// where `bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]`.
export const uploadAvatar = async (userId, file) => {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  if (!file) return { error: { message: 'No file provided' } };
  if (file.size > MAX_AVATAR_BYTES) {
    return { error: { message: `File too large (max ${Math.round(MAX_AVATAR_BYTES / 1024 / 1024)}MB)` } };
  }
  if (file.type && !ALLOWED_AVATAR_MIME.includes(file.type)) {
    return { error: { message: 'Unsupported format (PNG, JPEG, WebP, GIF)' } };
  }

  // Derive extension from MIME (client-reported filename ext is unreliable).
  const extByMime = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
  const ext = extByMime[file.type] || 'png';
  // Cache-bust via timestamp so the CDN doesn't serve a stale image after replace.
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || 'image/png', cacheControl: '3600' });
  if (uploadError) return { error: uploadError };

  const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const url = pub?.publicUrl;
  if (!url) return { error: { message: 'Failed to resolve public URL' } };

  const { error: updateError } = await updateProfile(userId, { avatar_url: url });
  if (updateError) return { error: updateError };

  return { url };
};

export const removeAvatar = async (userId) => {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  // Note: we don't currently sweep old files from the bucket here — the
  // timestamped path means each upload writes a fresh object, and wiping
  // older ones would require a list() + remove() round-trip that is fine
  // to leave to a future cleanup job. This just detaches the URL.
  const { error } = await updateProfile(userId, { avatar_url: null });
  return { error };
};
