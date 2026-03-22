# Mafia Wars - Current Context

## Status
Role assignment and role reveal are built. Night phase logic is not built yet.

## Completed
- [x] Supabase project created
- [x] GitHub repo created
- [x] Next.js project scaffolded
- [x] Supabase client created at /lib/supabase.ts
- [x] Constants file created at /lib/constants.ts
- [x] Game logic stubs created at /lib/gameLogic.ts
- [x] All 6 route page stubs created
- [x] All 3 component stubs created
- [x] PROJECT.md created
- [x] CONTEXT.md created
- [x] Lobby page built with Create Room and Join Room flows
- [x] /lib/types.ts created as single source of truth for all types
- [x] /lib/roomUtils.ts created as single source of truth for room database operations
- [x] /components/lobby/CreateRoom.tsx created
- [x] /components/lobby/JoinRoom.tsx created
- [x] /components/lobby/PlayerList.tsx created with live Supabase Realtime subscription
- [x] Role assignment logic implemented in /lib/gameLogic.ts
- [x] Game progression database writes in /lib/gameUtils.ts
- [x] Start Game now triggers real role assignment and navigation
- [x] Role reveal page built at /app/role-reveal/page.tsx
- [x] RoleCard component built at /components/role-reveal/RoleCard.tsx
- [x] PhaseWatcher component built - all players now auto-navigate on phase changes
- [x] Night phase built: MafiaAction, DoctorAction, DetectiveAction components
- [x] /lib/nightUtils.ts created for all night action database ops
- [x] /app/night/page.tsx replaced with real night phase logic

## Up Next
- [ ] Day phase: announce who was killed, start discussion timer
- [ ] Voting phase: players vote to eliminate someone
- [ ] End phase: full role reveal and winner announcement
- [ ] Win condition checks after each elimination

## Decisions Made
- Discussion timer options are 3, 5, or 7 minutes (host picks in lobby)
- Mafia count = floor(total players / 5), max 4
- Minimum 4 players, maximum 20 players
- .env.local is gitignored - credentials never pushed to GitHub

## Known Issues
- Page refresh in the lobby loses roomCode and playerId from client state. Acceptable for v1.
