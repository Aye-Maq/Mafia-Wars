export type Phase = "lobby" | "role-reveal" | "night" | "day" | "vote" | "end";

export type NightSubPhase =
  | "none"
  | "mafia_acting"
  | "doctor_acting"
  | "detective_acting"
  | "night_complete";

export type Player = {
  id: string;
  room_code: string;
  name: string;
  role: string | null;
  is_alive: boolean;
  is_host: boolean;
};

export type Room = {
  room_code: string;
  host_id: string;
  status: string;
  timer_config: number;
  created_at: string;
};

export type GameState = {
  room_code: string;
  phase: Phase;
  round_number: number;
  night_result: string | null;
  night_sub_phase: NightSubPhase;
  updated_at: string;
};
