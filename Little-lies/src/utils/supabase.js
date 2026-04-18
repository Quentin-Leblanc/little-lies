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

export const addXP = async (userId, amount, reason, gameId = null) => {
  if (!supabase) return null;

  // Log the XP gain
  await supabase.from('xp_log').insert({
    user_id: userId,
    amount,
    reason,
    game_id: gameId,
  });

  // Increment XP and games_played in profile
  const profile = await getProfile(userId);
  if (!profile) return null;

  const newXP = (profile.xp || 0) + amount;
  const newLevel = Math.floor(newXP / 100) + 1;

  return updateProfile(userId, {
    xp: newXP,
    level: newLevel,
  });
};

export const incrementGamesPlayed = async (userId, won = false) => {
  if (!supabase) return null;
  const profile = await getProfile(userId);
  if (!profile) return null;

  const updates = { games_played: (profile.games_played || 0) + 1 };
  if (won) updates.games_won = (profile.games_won || 0) + 1;

  return updateProfile(userId, updates);
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
