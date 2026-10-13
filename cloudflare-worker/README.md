# ClearPath Medicare live visual editor

The public site remains a static HTML page deployed from GitHub Pages. Cloudflare continues to manage the custom domain. The visual editor is included in `index.html`; the private publishing API is `cloudflare-worker/medicare-editor.js`.

## What the editor does

- Shows an **Edit website** button only when you open the site with `?edit=1` (or `#edit`), so ordinary visitors do not see the editor entry point.
- Supports passwordless pre-launch editing when the Worker variable `EDITOR_AUTH_MODE=prelaunch` is set; authentication is required by default for a public deployment.
- Lets the editor click text to edit it and click an image to replace it.
- Publishes page HTML and image uploads through an authenticated Cloudflare Worker.
- Keeps the GitHub token on the Worker, never in the browser.
- Uses the existing GitHub Actions checks and Pages deployment workflow.

## Required Cloudflare setup

These account-level steps cannot be completed from this repository alone.

1. In Cloudflare, open **Workers & Pages** and create a Worker named, for example, `clearpath-medicare-editor`.
2. Paste/deploy the contents of `cloudflare-worker/medicare-editor.js` as the Worker entry point.
3. Under the Worker settings, add these **secrets**:
   - `GITHUB_TOKEN`: create a GitHub fine-grained personal access token limited to repository `insomniavoid1-alt/medicare`, with **Contents: Read and write**. Do not use a classic token or grant access to unrelated repositories.
   - `EDITOR_PASSWORD`: set a long, unique password. Store it in a password manager.
4. While the site is private and pre-launch, add the Worker variable `EDITOR_AUTH_MODE` with value `prelaunch` to disable the password prompt. **Before making the site public, remove this variable or change its value to `secure`, and set the `EDITOR_PASSWORD` secret.** In pre-launch mode anyone who can reach the Worker route can publish edits, so do not leave it enabled on a public site.
5. Add the plain-text Worker variable `SITE_ORIGIN` with the exact public origin, such as `https://www.example.com` (no trailing slash or path). Use the actual live site's origin, not this example.
6. In Cloudflare, add a Worker route for the live custom domain and path `/api/*`. Ensure the domain's DNS record is proxied through Cloudflare so the route can run.
7. Keep the existing GitHub Pages custom-domain configuration. The site's normal page requests continue to be served by GitHub Pages; only `/api/*` is handled by the Worker.

## First-use checklist

- Visit `https://YOUR-DOMAIN/api/health` only after deployment. In pre-launch mode it should respond with editor API status without a password.
- Open your site with `?edit=1` at the end of the URL (for example, `https://YOUR-DOMAIN/?edit=1`). Choose **Edit website** and click **Open editor**.
- Click a short text element and edit it; click an image to upload a replacement; choose **Save & publish**.
- Confirm the GitHub Actions workflow passes, then check the public page in a fresh tab.

## Important notes

- Changes commit to the `main` branch. GitHub Actions tests the page and deploys the new version.
- Uploaded images are saved under `assets/uploads/`; the deployment workflow copies that directory into the published artifact.
- If a deploy fails, the previous published version normally remains live. Check the Actions run before retrying.
- This editor is intentionally a small visual content editor, not a full page builder. Editing navigation links, form behavior, scripts, or complex nested elements is not recommended.
- The existing contact form opens an email app and does not securely store or submit leads to a server.
- The editor password is a shared secret. Only give it to trusted editors, rotate it if exposed, and keep the GitHub token private.
