var assert = require('assert');
var { collectVotesFromResult } = require('../votes');

describe('collectVotesFromResult', function () {
  it('returns zeros for both options when result has no rows', function () {
    var result = { rows: [] };
    var votes = collectVotesFromResult(result);
    assert.deepStrictEqual(votes, { a: 0, b: 0 });
  });

  it('counts votes for option a', function () {
    var result = { rows: [{ vote: 'a', count: '7' }] };
    var votes = collectVotesFromResult(result);
    assert.strictEqual(votes.a, 7);
    assert.strictEqual(votes.b, 0);
  });

  it('counts votes for option b', function () {
    var result = { rows: [{ vote: 'b', count: '3' }] };
    var votes = collectVotesFromResult(result);
    assert.strictEqual(votes.a, 0);
    assert.strictEqual(votes.b, 3);
  });

  it('counts votes for both options', function () {
    var result = { rows: [{ vote: 'a', count: '12' }, { vote: 'b', count: '5' }] };
    var votes = collectVotesFromResult(result);
    assert.strictEqual(votes.a, 12);
    assert.strictEqual(votes.b, 5);
  });

  it('parses string counts to integers', function () {
    var result = { rows: [{ vote: 'a', count: '42' }] };
    var votes = collectVotesFromResult(result);
    assert.strictEqual(typeof votes.a, 'number');
    assert.strictEqual(votes.a, 42);
  });

  it('last row wins when the same option appears more than once', function () {
    var result = { rows: [{ vote: 'a', count: '10' }, { vote: 'a', count: '20' }] };
    var votes = collectVotesFromResult(result);
    assert.strictEqual(votes.a, 20);
  });
});
