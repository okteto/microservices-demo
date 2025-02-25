const pgp = require('pg-promise');

const dbConfig = {
  dbHost: `postgresql.${process.env.OKTETO_NAMESPACE}`,
  dbLogin: 'okteto',
  dbPassword: 'okteto',
  dbName: 'votes',
  dbPort: 5432,
};

const connectionString = `postgres://${dbConfig.dbLogin}:${dbConfig.dbPassword}@${dbConfig.dbHost}:${dbConfig.dbPort}/${dbConfig.dbName}`;
const db = pgp()(connectionString);

module.exports = {
    'projectId': 'okteto',
    e2e: {
      voteUrl: 'https://vote.example.com',
      resultUrl: 'https://result.example.com',
      setupNodeEvents(on, config) {
        on('task', {
          getVotesForA() {
            const query = "SELECT COUNT(id) AS count FROM votes WHERE vote='a'"; // any query you want to check
            return db.oneOrNone(query);
          },
          getVotesForB() {
            const query = "SELECT COUNT(id) AS count FROM votes WHERE vote='b'"; // any query you want to check
            return db.oneOrNone(query);
          },
        });
      },
      defaultCommandTimeout: 20000,
    },
  }