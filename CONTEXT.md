# Mafia Wars - Current Context

## Status
Scaffold complete. No game logic built yet.

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

## Up Next
- [ ] Run Supabase SQL to create the 5 database tables
- [ ] Build the Lobby page - host creates room, players join with code
- [ ] Build role assignment logic in gameLogic.ts

## Decisions Made
- Discussion timer options are 3, 5, or 7 minutes (host picks in lobby)
- Mafia count = floor(total players / 5), max 4
- Minimum 4 players, maximum 20 players
- .env.local is gitignored - credentials never pushed to GitHub

## Known Issues
None yet.
