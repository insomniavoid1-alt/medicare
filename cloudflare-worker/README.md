# ClearPath Medicare live visual editor

The public site remains a static HTML page deployed from GitHub Pages. Cloudflare continues to manage the custom domain. The visual editor is included in `index.html`; the publishing API is `cloudflare-worker/medicare-editor.js`.

## What the editor does

- Shows the **Edit website** button on the page by default; editor access is passwordless for pre-launch work.
- Supports direct text editing, field/placeholder updates, standard image replacement, inline CSS background-image replacement, and image alt-text updates.
- Lets the editor click text to edit it and click an image to replace it.
- Publishes page HTML and image uploads through the Cloudflare Worker without a password.
- Keeps the GitHub token on the Worker, never in the browser.
- Uses the existing GitHub Actions checks and Pages deployment workflow.

## Required Cloudflare setup

These account-level steps cannot be completed from this repository alone.

1. In Cloudflare, open **Workers & Pages** and create a Worker named, for example, `clearpath-medicare-editor`.
2. Paste/deploy the contents of `cloudflare-worker/medicare-editor.js` as the Worker entry point.
3. Under the Worker settings, add these **secrets**:
   - `GITHUB_TOKEN`: create a GitHub fine-grained personal access token limited to repository `insomniavoid1-alt/medicare`, with **Contents: Read and write**. Do not use a classic token or grant access to unrelated repositories.
4. Passwordless mode is enabled in the committed Worker code. This is intended only for private pre-launch development. Anyone who can reach the Worker route can publish edits; re-enable authentication before the site is public.
5. Add the plain-text Worker variable `SITE_ORIGIN` with the exact public origin, such as `https://www.example.com` (no trailing slash or path). Use the actual live site's origin, not this example.
6. In Cloudflare, add a Worker route for the live custom domain and path `/api/*`. Ensure the domain's DNS record is proxied through Cloudflare so the route can run.
7. Keep the existing GitHub Pages custom-domain configuration. The site's normal page requests continue to be served by GitHub Pages; only `/api/*` is handled by the Worker.

## First-use checklist

- Visit `https://YOUR-DOMAIN/api/health` only after deployment; it should return editor API status without a password.
- Open your site normally and choose **Edit website**, then click **Open editor**. Select text, standard images, or elements with inline CSS background images to edit them.
- Click a short text element and edit it; click an image to upload a replacement; choose **Save & publish**.
- Confirm the GitHub Actions workflow passes, then check the public page in a fresh tab.

## Important notes

- Changes commit to the `main` branch. GitHub Actions tests the page and deploys the new version.
- Uploaded images are saved under `assets/uploads/`; the deployment workflow copies that directory into the published artifact.
- If a deploy fails, the previous published version normally remains live. Check the Actions run before retrying.
- This editor is intentionally a visual content editor, not a full page builder. It supports ordinary HTML text elements, common form-field values/placeholders, `<img>` images, and inline CSS background images. Text drawn by canvas, pseudo-elements, or some SVG internals, and background images defined only in external stylesheets, may need direct code edits. Editing navigation behavior, scripts, or complex nested structures is not recommended.
- The existing contact form opens an email app and does not securely store or submit leads to a server.
- Passwordless mode is not safe for a public website: anyone who can reach the Worker route can change the page or upload images. Before launch, restore authentication and keep the GitHub token private.
