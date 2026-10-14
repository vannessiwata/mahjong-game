<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- `npm run dev` (`node server.js`) is the app server. It serves Next.js and Socket.IO together on port 3000. `npm run dev:next` does not start multiplayer.
- Open `http://localhost:3000`. `server.js` sets the Next.js hostname to `localhost`, so opening `127.0.0.1` is blocked for dev assets and hot reload.
- Solo play needs a player name, Start Solo Game, then Deal Hands before a tile can be discarded.
- `npm run build` type-checks and builds. `npm test` runs the engine tests when that script is present. `npm run lint` currently fails on existing React hook and unused-import issues.
- `RESEND_API_KEY` is optional. Creating a room skips the notification email when it is unset. `NOTIFICATION_EMAIL` overrides the recipient.
