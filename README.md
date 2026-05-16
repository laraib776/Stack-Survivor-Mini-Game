# Stack-Survivor-Mini-Game
# User vs The Stack

**User vs The Stack** is a browser-based developer brawler where the player enters their own name and fights through waves of software-themed enemies. It runs directly in the browser with HTML, CSS, and JavaScript, so it is easy to host on GitHub Pages.

## Play The Game

Open `index.html` in a browser, enter your player name, and press **Play Now**.

If this project is published with GitHub Pages, the game will be available at:

```text
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY-NAME/
```

Replace `YOUR-USERNAME` and `YOUR-REPOSITORY-NAME` with your actual GitHub username and repo name.

## About The Game

The player is dropped into a wave-based arena and must survive against enemies from "the stack." Each wave introduces more pressure, stronger enemy combinations, and bigger threats.

The game includes:

- Custom player name input
- Player initials shown on the character sprite
- Moving enemies with different attack styles
- Wave-based progression
- Score, kills, wave, health, and high score tracking
- Melee attack and ranged code blast
- Mobile touch controls
- Landscape prompt for mobile devices
- Exit button during gameplay
- No build tools or installation required

## Enemies

| Enemy | Behavior |
| --- | --- |
| AI Bot | Fast basic melee enemy that chases the player |
| Stack Dev | Keeps distance and throws coffee projectiles |
| Senior Eng. | Tankier enemy that charges hard |
| ML Boss | Boss enemy that fires data projectiles and can spawn bots |

## Controls

### Keyboard

| Action | Key |
| --- | --- |
| Move | Left / Right arrows or A / D |
| Jump | W, Up arrow, or Space |
| Melee attack | Z |
| Code blast | X |
| Exit game | Exit button on screen |

### Mobile

Mobile controls appear on touch devices while playing:

- Left button: move left
- Right button: move right
- Up button: jump
- Z button: melee attack
- X button: code blast

For the best mobile experience, rotate the phone to landscape mode.

## Project Structure

```text
USERvsDEV/
├── index.html
├── README.md
├── css/
│   └── styles.css
├── js/
│   └── game.js
└── legacy/
    ├── game-code-copy.html
    └── lk-brawler (2).html
```

### Main Files

- `index.html` contains the game layout and menu screens.
- `css/styles.css` contains all styling, responsive layout, buttons, overlays, and mobile presentation.
- `js/game.js` contains the canvas game loop, player logic, enemy AI, collisions, scoring, waves, and controls.
- `legacy/` keeps the older single-file HTML versions for reference.

## Run Locally

Because this is a static browser game, you can run it without installing anything.

### Option 1: Open Directly

Open this file in your browser:

```text
index.html
```

### Option 2: Use A Local Server

If you prefer running it from a local server, use one of these commands from the project folder:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Deploy To GitHub Pages

1. Create a new GitHub repository.
2. Upload these project files to the repository:
   - `index.html`
   - `README.md`
   - `css/`
   - `js/`
   - `legacy/` if you want to keep the old versions online too
3. Go to the repository on GitHub.
4. Open **Settings**.
5. Open **Pages** from the left sidebar.
6. Under **Build and deployment**, choose:
   - **Source:** Deploy from a branch
   - **Branch:** `main`
   - **Folder:** `/root`
7. Click **Save**.
8. Wait for GitHub to publish the site.
9. Open the Pages URL shown by GitHub.

The game should load automatically because GitHub Pages looks for `index.html` at the root of the repository.

## Customization

You can customize the game by editing:

- Game title and menu text in `index.html`
- Colors, layout, and button styles in `css/styles.css`
- Enemy health, speed, damage, and score values in `js/game.js`
- Wave names and enemy wave patterns in `js/game.js`

Useful areas in `js/game.js`:

- `ETYPES` controls enemy stats.
- `WAVES` controls enemy wave composition.
- `WAVE_NAMES` controls wave announcement names.
- `Player` controls player movement, attacks, health, and drawing.
- `Enemy` controls enemy behavior and attacks.

## Browser Support

The game uses standard browser features:

- HTML5 canvas
- CSS
- JavaScript
- `localStorage` for player name and high score

It should work in modern versions of Chrome, Edge, Firefox, and Safari.

## Notes

- No external build system is required.
- No package manager is required.
- The game is designed to be hosted as a static site.
- High scores are saved in the browser using `localStorage`, so scores are stored per device/browser.

## License

You can add your preferred license here. If you want others to freely use, modify, and share the game, consider adding an MIT License.
