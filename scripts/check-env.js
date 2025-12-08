const {
  MYSQL_URL,
  MYSQL_PUBLIC_URL,
  MYSQL_DATABASE,
  MYSQLDATABASE,
  MYSQLUSER,
  MYSQL_ROOT_PASSWORD,
  MYSQLPASSWORD,
  MYSQLHOST,
  MYSQLPORT,
  RAILWAY_PRIVATE_DOMAIN,
  RAILWAY_TCP_PROXY_DOMAIN,
  RAILWAY_TCP_PROXY_PORT,
} = process.env;

const database = MYSQL_DATABASE || MYSQLDATABASE || 'railway';
const user = MYSQLUSER || 'root';
const password = MYSQL_ROOT_PASSWORD || MYSQLPASSWORD;
const privateHost = MYSQLHOST || RAILWAY_PRIVATE_DOMAIN;
const port = MYSQLPORT || '3306';
const publicHost = RAILWAY_TCP_PROXY_DOMAIN;
const publicPort = RAILWAY_TCP_PROXY_PORT;

if (!MYSQL_URL && password && privateHost) {
  process.env.MYSQL_URL = `mysql://${user}:${password}@${privateHost}:${port}/${database}`;
  console.info('MYSQL_URL was missing and has been derived from Railway MySQL variables.');
}

if (!process.env.MYSQL_URL) {
  console.warn(
    "MYSQL_URL is not set. Database connections are disabled. Provide ${MySQL.MYSQL_URL} (Railway) or a manual connection string in your environment."
  );
}

if (!MYSQL_PUBLIC_URL && password && publicHost && publicPort) {
  process.env.MYSQL_PUBLIC_URL = `mysql://${user}:${password}@${publicHost}:${publicPort}/${database}`;
  console.info('MYSQL_PUBLIC_URL was missing and has been derived from Railway TCP proxy variables.');
}
