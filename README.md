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
- Railway’s MySQL raw variables are now wired directly into the app: if `MYSQL_URL` is missing at startup, it will be derived automatically from the Railway-provided values (`MYSQL_ROOT_PASSWORD`, `MYSQLUSER`, `RAILWAY_PRIVATE_DOMAIN`, etc.).
- Set the following environment variables (see [.env.example](.env.example)):
  - `GEMINI_API_KEY`
  - `MYSQL_DATABASE`, `MYSQL_ROOT_PASSWORD`, `MYSQLUSER`, `MYSQLPORT`, `MYSQLHOST`, and optionally `MYSQL_PUBLIC_URL`/`MYSQL_URL` if you want to override the derived defaults.
- Example Railway MySQL raw block (copy into your service variables as needed):
  ```
  MYSQL_DATABASE="railway"
  MYSQL_PUBLIC_URL="mysql://${MYSQLUSER}:${MYSQL_ROOT_PASSWORD}@${RAILWAY_TCP_PROXY_DOMAIN}:${RAILWAY_TCP_PROXY_PORT}/${MYSQL_DATABASE}"
  MYSQL_ROOT_PASSWORD="LmWlfRbRIDUOYOUTCJeRgWMovLIGSarY"
  MYSQL_URL="mysql://${MYSQLUSER}:${MYSQL_ROOT_PASSWORD}@${RAILWAY_PRIVATE_DOMAIN}:3306/${MYSQL_DATABASE}"
  MYSQLDATABASE="${MYSQL_DATABASE}"
  MYSQLHOST="${RAILWAY_PRIVATE_DOMAIN}"
  MYSQLPASSWORD="${MYSQL_ROOT_PASSWORD}"
  MYSQLPORT="3306"
  MYSQLUSER="root"
  ```
- Apply the schema in [`db/schema.sql`](db/schema.sql) to initialize the external MySQL database.
- The `npm start` precheck now fails fast when it cannot derive or find a MySQL connection string, preventing the app from starting without a live database URL.
