if (!process.env.MYSQL_URL) {
  console.warn(
    "MYSQL_URL is not set. Database connections are disabled. Provide ${MySQL.MYSQL_URL} (Railway) or a manual connection string in your environment."
  );
}
