# Trading Journal

A mobile-friendly trading journal backed by Notion. No build step — plain HTML/JS frontend + tiny serverless API.

## 1. Create a Notion integration (one-time, ~2 minutes)

1. Go to https://www.notion.so/my-integrations → **New integration**.
2. Name it anything (e.g. "Trading Journal App"), select your workspace, create it.
3. Copy the **Internal Integration Secret** — this is your `NOTION_TOKEN`. Keep it private.
4. Open your Trading Journal page in Notion: https://app.notion.com/p/3d9ee663ec1e81abb647ee3ae395d8a4
5. Click **Share** (top right) → **Invite** → select the integration you just created → give it access.
   This shares the page and both databases underneath it with your integration.

## 2. Deploy to Vercel (free)

1. Push this folder to a new GitHub repo.
2. Go to https://vercel.com → **New Project** → import that repo.
3. Before deploying, add these **Environment Variables**:

   | Name | Value |
   |---|---|
   | `NOTION_TOKEN` | *(the secret you copied in step 1)* |
   | `NOTION_TRADES_DB` | `0a14a9f8dfdf45f5a1be0070c1d4d02e` |
   | `NOTION_SETTINGS_DB` | `1f8d652405c64d7c95536b616d9ff23b` |
   | `NOTION_SETTINGS_PAGE_ID` | `3d9ee663ec1e81af9320e86cce726498` |

4. Click **Deploy**. You'll get a live URL like `https://your-app.vercel.app`.

## 3. Use it on your phone

Open the URL in your phone's browser, then use the browser menu → **Add to Home Screen**.
It'll behave like a normal app icon from there.

## Notes

- All trades and your targets/settings live in the two Notion databases under
  "Trading Journal" in your workspace — you can also view or edit them directly in Notion.
- The Notion token only lives on the server (Vercel environment variable) — it's never sent to the browser.
- If you ever change `NOTION_TOKEN` or lose access, just repeat step 1 and update the Vercel env var.
