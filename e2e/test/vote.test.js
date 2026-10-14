var assert = require('assert');
var crypto = require('crypto');
var pg = require('pg');
var { io } = require('socket.io-client');

// `okteto test` runs in its own namespace, so the app is reached through its
// public endpoints and the database through its namespace-qualified service.
var NAMESPACE = process.env.OKTETO_NAMESPACE;
var DOMAIN = process.env.OKTETO_DOMAIN;
if (!NAMESPACE || !DOMAIN) {
  throw new Error('OKTETO_NAMESPACE and OKTETO_DOMAIN must be set');
}

var VOTE_URL = 'https://vote-' + NAMESPACE + '.' + DOMAIN;
var RESULT_URL = 'https://result-' + NAMESPACE + '.' + DOMAIN;
var DATABASE_URL =
  'postgres://okteto:okteto@postgresql.' + NAMESPACE + ':5432/votes';

console.log('vote: %s, result: %s, database: postgresql.%s', VOTE_URL, RESULT_URL, NAMESPACE);

var WAIT_TIMEOUT_MS = 90000;
var POLL_INTERVAL_MS = 1000;

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

async function waitFor(description, check) {
  var deadline = Date.now() + WAIT_TIMEOUT_MS;
  var lastValue;
  while (Date.now() < deadline) {
    lastValue = await check();
    if (lastValue) {
      return lastValue;
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error('Timed out waiting for ' + description);
}

async function countVotes(pool) {
  var result = await pool.query(
    'SELECT vote, COUNT(id) AS count FROM votes GROUP BY vote'
  );
  var votes = { a: 0, b: 0 };
  result.rows.forEach(function (row) {
    votes[row.vote] = parseInt(row.count);
  });
  return votes;
}

describe('voting app end-to-end', function () {
  var pool;
  var socket;
  var latestScores;

  before(async function () {
    pool = new pg.Pool({ connectionString: DATABASE_URL });

    socket = io(RESULT_URL, { transports: ['polling'] });
    socket.on('scores', function (json) {
      latestScores = JSON.parse(json);
    });

    // The worker creates the votes table on startup, and the result service
    // starts broadcasting scores once it can query it.
    await waitFor('the result service to publish scores', function () {
      return latestScores;
    });
  });

  after(async function () {
    if (socket) {
      socket.close();
    }
    if (pool) {
      await pool.end();
    }
  });

  it('stores a vote in the database and shows it in the result service', async function () {
    var voterId = 'e2e-' + crypto.randomUUID();
    var before = await countVotes(pool);

    var response = await fetch(VOTE_URL + '/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: 'voter_id=' + voterId,
      },
      body: new URLSearchParams({ vote: 'a' }),
    });
    assert.strictEqual(response.status, 200, 'vote service rejected the vote');

    // The worker keys rows by message sequence rather than voter id, so the
    // vote is detected by the count for "a" going up.
    await waitFor('the vote to be stored in the database', async function () {
      var votes = await countVotes(pool);
      return votes.a >= before.a + 1;
    });

    // Wait until the result service reports the same totals as the database.
    await waitFor('the result service to show the vote', async function () {
      var expected = await countVotes(pool);
      return (
        latestScores &&
        expected.a >= before.a + 1 &&
        latestScores.a === expected.a &&
        latestScores.b === expected.b
      );
    });
  });
});
