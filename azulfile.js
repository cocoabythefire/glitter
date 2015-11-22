'use strict';

module.exports = {
  production: {
    adapter: 'pg',
    connection: {
      database: 'glitter',
      user: process.env.PG_USER || 'root',
      password: '',
    },
  },
  development: {
    adapter: 'pg',
    connection: {
      database: 'glitter',
      user: process.env.PG_USER || 'root',
      password: '',
    },
  },
  test: {
    adapter: 'pg',
    connection: {
      database: 'glitter_test',
      user: process.env.PG_USER || 'root',
      password: '',
    },
  },
};
