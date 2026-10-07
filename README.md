# EKO NITRO - Netlify setup

1. Create a new GitHub repository and upload everything in this folder (keep the folder structure).
2. In Netlify: Add new site > Import an existing project > pick the repo. Build settings are read from netlify.toml (publish: public, functions: netlify/functions).
3. Before the first deploy (or then redeploy): Site configuration > Environment variables > add AUTH_SECRET = a long random string (40+ characters). Never put it in the code or share it.
4. Deploy. Open your site, create an account, race, then check the Leaderboard.
5. Your data lives in Netlify Blobs (Site > Blobs). Do not test destructive changes from deploy previews.

Notes: passwords are hashed (scrypt). There is no password reset. Server limits stop casual cheating but cannot stop a determined cheater, because the game runs in the browser.
