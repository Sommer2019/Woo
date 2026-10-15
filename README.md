# Woo 🕹️ — a trashy browser "home console"

Woo is a free, fan-made, deliberately low-budget parody of a mid-2000s motion-control console.
It is **not affiliated with, endorsed by or connected to Nintendo** (or anyone else).
No real console games run on it, and none of its art, music or code comes from one — every game is an
original knock-off written from scratch in plain JavaScript.

- **TV / screen:** a static website (GitHub Pages).
- **Remote:** your phone's browser. No app to install. It uses the gyroscope as a pointer, the
  accelerometer for swings, and tilt for steering. Up to **4 phones** at once.

## Channels

| Channel | What it is | How to hold the remote |
|---|---|---|
| **Disc Channel** | "Reads a disc" and boots a random game | — |
| **Woo Me Channel** | Make an avatar ("Me") for each player slot; they appear in the games | Pointer |
| **Woo Kart** | Split-screen kart racer, 3 tracks, items, drifting, CPU racers | Sideways: **2** gas, **1** brake, **tilt**/D-pad steer, **B** drift, **D-pad ↑/A** item |
| **Super Woo Bros.** | 4-player co-op platformer, 3 worlds, stand on each other's heads | Sideways: D-pad move, **2** jump, **1** run, **shake** twirl |
| **Woo Sports** | Bowling, Tennis, Boxing | Pointer, **swing** your phone |
| **Woo Play: Duck Blaster** | Shooting gallery for everyone at once | Pointer, **B/A** fire |
| **Woo Fishing** | Hold your lure still, yank the phone up when it bites | Pointer |
| **Woo Tanks!** | Co-op top-down tank missions | D-pad drive, pointer aim, **A/B** fire, **1** mine |
| **???** | There's a suspicious red letter in the message board (✉). Don't open it. | — |

The menu works like you remember: a 4×3 grid of channels, click one to get a big preview with
**Woo Menu** / **Start**, a clock at the bottom, a round **woo** button (settings) on the left and an
envelope (connect remotes) on the right. Press **HOME** on any remote for the HOME Menu (Woo Menu / Reset, battery levels).

## Playing

1. Open the site on the TV/laptop: `https://<user>.github.io/<repo>/`
2. Click the screen once (browsers only allow sound after a click).
3. Scan the QR code with each phone (or open `…/remote/` and type the 4-letter console code).
4. Allow motion sensors when the phone asks. The phone shows a remote with the classic button order:
   power, D-pad, **A**, **B** (trigger), **− HOME +**, **1**, **2** and the 4 player LEDs.
   When a game needs it the phone flips to the sideways layout automatically.

Phone pointer tips: point the top of the phone at the screen and turn your wrist. You can also drag your
thumb on any empty part of the remote to move the cursor. Pointer speed and axis inversion live in the
**woo** settings on the TV and in ⚙ on the phone.

**No phone?** The keyboard/mouse is Player 1: mouse = pointer, left click = A, right click/Shift = B,
arrows/WASD = D-pad, Z = 1, X = 2, Space = swing, Enter = A, H/Esc = HOME.

## How it works

- Phones talk to the TV over **WebRTC** using the free [PeerJS](https://peerjs.com) cloud broker for the
  handshake, so it works from a static GitHub Pages site. If the TV and the remote are tabs in the same
  browser they use a `BroadcastChannel` instead (great for testing).
- If a direct WebRTC connection can't be made within ~5 s (typical when the phone is on mobile data and
  the TV on Wi-Fi), the remote falls back to a **relay over public MQTT brokers** (HiveMQ, EMQX,
  Mosquitto — `js/lib/mqtt-lite.js`). Only button/motion input and console messages go through it, on a
  topic named after the console code; anyone who knows the code could read or send them, so don't treat it as private.
- 3D games use [three.js](https://threejs.org); 2D games use canvas. QR codes via
  [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator). All three are MIT-licensed and vendored in `js/lib/`.
- Sound effects and music are synthesized live with WebAudio (original tunes).

```
index.html          the TV (menu, channels, HOME menu)
js/main.js          menu / pointer UI / remotes / game host
js/net.js           PeerJS + BroadcastChannel host
js/input.js         players, buttons, keyboard fallback
js/audio.js         synth sound effects + music sequencer
js/me.js            avatars
js/channels.js      channel list + thumbnail art
js/games/*.js       the games
remote/             the phone remote
```

## Hosting on GitHub Pages

Repository **Settings → Pages → Build and deployment → Source: GitHub Actions**. The workflow in
`.github/workflows/pages.yml` then deploys every push to `main` (and can be started by hand under
**Actions → Deploy to GitHub Pages → Run workflow**). There is no build step. To run locally, serve the folder
with any static server (e.g. `npx http-server .`); phones need HTTPS for motion sensors, so use the Pages URL for real play.

Dev shortcuts: `?skip=1` jumps past the warning screen, `?game=kart` (or `bros`, `sports`, `duck`, `fish`, `tanks`, `me`) boots straight into a game.
