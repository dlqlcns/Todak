<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/11UruRzyeqOz8IC17V0azoJT-9pPe_mJh

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploying on Railway

- The service start command is configured as `npm start` (preview server bound to `0.0.0.0` for Railway).
- Set the following environment variables (see [.env.example](.env.example)):
  - `GEMINI_API_KEY`
  - `MYSQL_URL` (use the provided `${MySQL.MYSQL_URL}` from Railway's built-in MySQL service)
- Apply the schema in [`db/schema.sql`](db/schema.sql) to initialize the external MySQL database.
- The `npm start` precheck warns if `MYSQL_URL` is missing so you can set it before deploying; without it, database connections will stay disabled.
