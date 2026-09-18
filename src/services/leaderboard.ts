import { supabase } from "@/lib/supabaseClient";

export interface LeaderboardEntry {
  display_name: string;
  avatar_url: string | null;
  xp: number;
  level: number;
  streak: number;
  is_you: boolean;
}

export async function getLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc("get_leaderboard", { p_limit: limit });
  if (error) throw error;
  return data ?? [];
}

export async function getMyRank(): Promise<number | null> {
  const { data, error } = await supabase.rpc("get_my_rank", {});
  if (error) throw error;
  return data ?? null;
}
