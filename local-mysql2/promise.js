export const createPool = () => {
  throw new Error('mysql2 driver is unavailable in this environment. Install mysql2 from npm when network access is permitted.');
};

export default { createPool };
