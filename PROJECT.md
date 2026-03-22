# Mafia Wars - Project Reference

## What This Is
A browser-based multiplayer social deduction game. Players join via shared link, play on their own phones in the same room. No install required. Free to play.

## Accounts
| Service | Account |
|---|---|
| GitHub | ayeshamaqsood8100@gmail.com |
| Supabase | ayeshamaqsood6100@gmail.com |
| Vercel | ayeshamaqsood8100@gmail.com |

## GitHub Repo
https://github.com/Aye-Maq/Mafia-Wars

## Supabase
- Project: Mafia_Wars
- URL: https://bajzfecfwoneynvzxbxo.supabase.co

## Tech Stack
| Layer | Tech |
|---|---|
| Frontend | Next.js 14 App Router |
| Database + Realtime | Supabase |
| Styling | Tailwind CSS |
| Hosting | Vercel |
| Language | TypeScript |

## AI Roles
| AI | Responsibility |
|---|---|
| Claude | Game logic, architecture, bug review, state management |
| GPT Codex | Boilerplate, scaffolding, file creation, iteration |
| Gemini | Card visuals, UI design, colors, layout |

## Rules For All AIs
1. Always read PROJECT.md and CONTEXT.md before doing anything
2. Review instructions and flag concerns before executing
3. Never change the tech stack
4. Never restart or restructure the project without explicit instruction
5. Always explain what you are doing in plain English

## Supabase Tables (to be created)
- rooms: room_code, host_id, status, timer_config, created_at
- players: id, room_code, name, role, is_alive, is_host
- game_state: room_code, phase, round_number, night_result, updated_at
- night_actions: room_code, player_id, action_type, target_id, round
- votes: room_code, voter_id, target_id, round
