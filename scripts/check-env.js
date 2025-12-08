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
  console.error(
    [
      'MYSQL_URL is not set and could not be derived. Database connections will fail.',
      'Provide ${MySQL.MYSQL_URL} in Railway or set a manual connection string (e.g. mysql://user:pass@host:3306/db).',
      'Hint: Railway exposes MYSQL_ROOT_PASSWORD, MYSQLUSER, RAILWAY_PRIVATE_DOMAIN, and MYSQL_DATABASE for you to compose the URL.',
    ].join('\n')
  );
  process.exit(1);
}

if (!MYSQL_PUBLIC_URL && password && publicHost && publicPort) {
  process.env.MYSQL_PUBLIC_URL = `mysql://${user}:${password}@${publicHost}:${publicPort}/${database}`;
  console.info('MYSQL_PUBLIC_URL was missing and has been derived from Railway TCP proxy variables.');
}
