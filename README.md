# 🀄 Hong Kong Mahjong (香港麻雀)

An authentic, full-featured **Hong Kong Mahjong** game built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS v4**, and **Socket.IO** for real-time multiplayer.

---

## 🌟 Highlights

- **Authentic Hong Kong Rules (13-Tile / 傳統十三張規則)**:
  - Complete 136 standard tiles (Characters 萬, Dots 筒, Bamboo 條, Winds 風, Dragons 三元牌) + 8 bonus Flowers/Seasons (花牌).
  - Melds: **Chow (吃 / Chi)**, **Pung (碰 / Peng)**, **Kong (槓 / Gang)**, and **Hu / Win (食糊 / Sik Wu)**.
  - Priority-based claim arbitration (Hu > Gang/Peng > Chow).
  - Standard 4 Melds + 1 Pair validation, plus special patterns:
    - Thirteen Orphans (十三幺)
    - Seven Pairs (七對子)
    - All Triplets / Pong Pong Hu (對對胡)
    - Pure One Suit (清一色) & Mixed One Suit (混一色)
    - Big & Little Three Dragons (大三元 / 小三元)
    - All Honors (字一色)
  - Configurable minimum fan requirement (0 Fan / 雞糊 or 3 Fan / 正宗起糊).
- **Intelligent AI Bots**:
  - Automatically fills empty seats for Solo play or fills in for disconnected multiplayer users.
  - Shanten tile utility evaluation (discards weak isolated honors/terminals, builds sequences and triplets).
  - Claim evaluation (identifies when to Chi, Peng, Gang, or declare Hu).
  - Natural thinking delays with animated status indicators ("Thinking...", "Peng!", "Kong!").
- **Real-Time Multiplayer (Socket.IO)**:
  - Custom Node.js + Socket.IO server bundled into Next.js (`server.js`).
  - Room code lobbies (e.g. `ROOM88`) with seat assignments (East, South, West, North).
  - Real-time synchronisation of discards, claims, and turn updates.
- **Rich Tactile UI & Sound**:
  - Tactile 3D Mahjong tiles with authentic Chinese calligraphy and ivory face-beveling.
  - Emerald green felt table layout with 4-player discard river (牌河) and center turn compass HUD.
  - Real-time **Ting (聽牌)** ready-hand detector displaying which tiles you are waiting on.
  - Offline **Web Audio API synthesizer** generating crisp tile clacks, slides, claim chimes, and victory fanfares without external audio dependencies.
  - Victory celebration with animated confetti and fan breakdown.

---

## 🚀 Getting Started

### 1. Installation

Ensure Node.js is installed, then install dependencies:

```bash
cd mahjong-game
npm install
```

### 2. Run the Game

Start the unified Next.js + Socket.IO server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎮 How to Play

1. **Lobby**:
   - **Solo vs 3 Bots**: Jump straight into a match against AI opponents (Ling, Ken, and Ming).
   - **Online Room**: Enter a Room Code to join or host a multiplayer table with friends.
2. **On Your Turn**:
   - Draw a tile from the wall.
   - Click a tile in your hand to select it. Click again or press **Discard** to play it into the center river.
   - Click **Ting (聽牌)** to see which winning tiles you are waiting on.
   - If you draw a winning tile, press **ZIMO! (自摸食糊)**.
3. **When Opponents Discard**:
   - An action bar floats up if you can claim the tile:
     - **Hu (食糊)**: Claim the tile to win the hand!
     - **Kong (槓)**: Claim 4-of-a-kind.
     - **Pung (碰)**: Claim 3-of-a-kind.
     - **Chow (吃)**: Form a 3-tile run (only valid from player on your left).
     - **Pass (過)**: Ignore and pass priority.

---

## 📁 Project Structure

```
mahjong-game/
├── server.js                          # Custom Node.js + Socket.IO server
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout & metadata
│   │   ├── page.tsx                   # Main entry point (Lobby & Table switcher)
│   │   └── globals.css                # Tailwind CSS v4 styling
│   ├── components/
│   │   └── mahjong/
│   │       ├── Tile.tsx               # 3D Tactile Mahjong tile component
│   │       ├── PlayerHand.tsx         # Interactive rack (sorting, drawn tile, discard)
│   │       ├── OpponentHand.tsx       # Opponents (avatars, tile backs, status bubbles)
│   │       ├── DiscardRiver.tsx       # 4-quadrant center discard pool
│   │       ├── CenterTable.tsx        # HUD (round wind, wall count, dealer, turn compass)
│   │       ├── ActionBar.tsx          # Claim floating prompts (Hu, Kong, Pung, Chow, Pass)
│   │       ├── WinningModal.tsx       # Confetti fanfare & Fan breakdown modal
│   │       ├── RulesModal.tsx         # Comprehensive rules & Fan guide modal
│   │       ├── Table.tsx              # Main table view
│   │       └── Lobby.tsx              # Room code and mode setup
│   ├── hooks/
│   │   └── useMahjongGame.ts          # Core game loop & turn state hook
│   └── lib/
│       ├── socket.ts                  # Socket.IO client instance
│       └── mahjong/
│           ├── types.ts               # Tile, Meld, Player, and Game state types
│           ├── tiles.ts               # 136/144 tiles generator, shuffle, sorter
│           ├── rules.ts               # Chow/Pung/Kong/Hu validation & Fan scoring
│           ├── bot.ts                 # AI bot discard & claim decision engine
│           └── audio.ts               # Web Audio API sound synthesizer
```
