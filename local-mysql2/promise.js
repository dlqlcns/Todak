const buildStubError = () => {
  const error = new Error('mysql2 driver is unavailable in this environment. Install mysql2 from npm when network access is permitted.');
  error.code = 'MYSQL2_STUB';
  return error;
};

export const createPool = () => {
  console.warn('mysql2 stub in use. Database operations are disabled until the real driver is installed.');
  const error = buildStubError();
  return {
    __stub: true,
    async execute() {
      throw error;
    },
    async query() {
      throw error;
    },
    async end() {
      return undefined;
    },
  };
};

export default { createPool };
