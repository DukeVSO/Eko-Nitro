# Lasgidi Rush - Netlify setup

1. Create a new GitHub repository and upload everything in this folder (keep the folder structure).
2. In Netlify: Add new site > Import an existing project > pick the repo. Build settings are read from netlify.toml (publish: public, functions: netlify/functions).
3. Before the first deploy (or then redeploy): Site configuration > Environment variables > add AUTH_SECRET = a long random string (40+ characters). Never put it in the code or share it.
4. Deploy. Open your site, create an account, race, then check the Leaderboard.
5. Your data lives in Netlify Blobs (Site > Blobs). Do not test destructive changes from deploy previews.

Notes: passwords are hashed (scrypt). There is no password reset. Server limits stop casual cheating but cannot stop a determined cheater, because the game runs in the browser.

Music: the five radio songs live in public/audio, and the baked billboard pictures live in public/img. Keep both folders in your GitHub upload. The three channels are a DJ mix: each plays all five songs in its own order and crossfades between them. To change a song, replace the file and edit its title and artist in public/index.html (search for TRK). The order each channel plays them in is the PLY list.

## Automated tests
The `tests` folder holds a headless smoke test (menu, profile, career, first event, countdown, driving, finish, garage, radio channels, settings, console errors).
Run it with: `cd tests && npm install && npm test`. It needs Node 18+. These dev tools are only for you; Netlify does not run them.
Add `?debug` to the game address (or press F3) to see FPS, draw calls and triangles.

## Visual showcase (development only)
Open the game address with `?showcase` at the end (for example `https://your-site.netlify.app/?showcase`).
A small panel lets you switch DAY, MORNING, SUNSET, NIGHT, RAIN and NIGHT+RAIN, jump between Third Mainland Bridge and Oworonshoki, change the camera (chase, orbit, front, low), speed, police and brake lights, and nudge exposure, sun and ambient light.
The panel shows the current exposure so you can tell me which values look best. It does not touch your saved game. Normal players never see it.
Add `?debug` (or press F3) for FPS, frame time, draw calls and triangles. You can use both: `?showcase&debug`.

## Cinematic intro
The game opens with the LASGIDI RUSH intro (about 5 seconds, skippable after 1.5 s with Space, Enter, click or tap), then fades into the normal menu. It plays once per page load. For development you can skip it with `?nointro` on the address. The tests in `tests/intro.js` cover it.
