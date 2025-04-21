#!/usr/bin/env sh

# abort on errors
set -e

# build
npm run build

# navigate into the build output directory
cd dist

# if deploying to a custom domain
# echo 'www.example.com' > CNAME

# Create 404.html (same as index.html) for GitHub Pages SPA routing
cp index.html 404.html

# Initialize git, add changes, and commit
git init
git add -A
git commit -m 'Deploy to GitHub Pages'

# if you're deploying to https://<USERNAME>.github.io/<REPO>
# Replace <USERNAME> and <REPO> with your GitHub username and repository name
git push -f https://github.com/<USERNAME>/<REPO>.git main:gh-pages

cd - 