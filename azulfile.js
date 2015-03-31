'use strict';

module.exports = {
  production: {
    adapter: 'pg',
    connection: {
      database: 'glitter',
      user: 'root',
      password: ''
    }
  },
  development: {
    adapter: 'pg',
    connection: {
      database: 'glitter',
      user: 'root',
      password: ''
    }
  },
  test: {
    adapter: 'pg',
    connection: {
      database: 'glitter_test',
      user: 'root',
      password: ''
    }
  }
};
