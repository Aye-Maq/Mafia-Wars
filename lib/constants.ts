export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 20;
export const NIGHT_ACTION_TIMER = 60; // seconds
export const VOTING_TIMER = 60; // seconds
export const ROLE_REVEAL_DURATION = 10; // seconds
export const DISCUSSION_TIMER_OPTIONS = [3, 5, 7] as const; // minutes
export const PHASES = [
  "lobby",
  "role-reveal",
  "night",
  "day",
  "vote",
  "end",
] as const;

export type Phase = (typeof PHASES)[number];
