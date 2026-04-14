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
