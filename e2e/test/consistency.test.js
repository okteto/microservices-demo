'use strict';

const assert = require('assert');

const namespace = process.env.OKTETO_NAMESPACE;
const domain = process.env.OKTETO_DOMAIN;

if (!namespace || !domain) {
  throw new Error('OKTETO_NAMESPACE and OKTETO_DOMAIN must be set');
}

const VOTE_URL = `https://vote-${namespace}.${domain}`;
const RESULT_URL = `https://result-${namespace}.${domain}`;

async function fetchHTML(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} returned ${res.status}`);
  return res.text();
}

// Extracts { a, b } labels from the vote service rendered HTML.
// The vote page renders Thymeleaf buttons: <button id="a" ...>Label</button>
function extractVoteLabels(html) {
  const a = html.match(/<button[^>]+id="a"[^>]*>([^<]+)<\/button>/);
  const b = html.match(/<button[^>]+id="b"[^>]*>([^<]+)<\/button>/);
  assert.ok(a, 'vote: could not find button#a in HTML');
  assert.ok(b, 'vote: could not find button#b in HTML');
  return { a: a[1].trim(), b: b[1].trim() };
}

// Extracts [optionA, optionB] labels from the result service rendered HTML.
// The result page has two <div class="label"> elements in order: a then b.
function extractResultLabels(html) {
  const matches = [...html.matchAll(/<div class="label">([^<]+)<\/div>/g)];
  assert.ok(matches.length >= 2, 'result: could not find two .label divs in HTML');
  return { a: matches[0][1].trim(), b: matches[1][1].trim() };
}

describe('e2e: vote and result service consistency', function () {
  this.timeout(15000);

  let voteLabels;
  let resultLabels;

  before(async function () {
    const [voteHTML, resultHTML] = await Promise.all([
      fetchHTML(VOTE_URL),
      fetchHTML(RESULT_URL),
    ]);
    voteLabels = extractVoteLabels(voteHTML);
    resultLabels = extractResultLabels(resultHTML);
  });

  it('vote service is reachable', async function () {
    const res = await fetch(VOTE_URL);
    assert.ok(res.ok, `vote service at ${VOTE_URL} returned ${res.status}`);
  });

  it('result service is reachable', async function () {
    const res = await fetch(RESULT_URL);
    assert.ok(res.ok, `result service at ${RESULT_URL} returned ${res.status}`);
  });

  it('vote service exposes a non-empty option A label', function () {
    assert.ok(voteLabels.a.length > 0, 'option A label is empty in vote service');
  });

  it('vote service exposes a non-empty option B label', function () {
    assert.ok(voteLabels.b.length > 0, 'option B label is empty in vote service');
  });

  it('result service exposes a non-empty option A label', function () {
    assert.ok(resultLabels.a.length > 0, 'option A label is empty in result service');
  });

  it('result service exposes a non-empty option B label', function () {
    assert.ok(resultLabels.b.length > 0, 'option B label is empty in result service');
  });

  it('option A label matches between vote and result services', function () {
    assert.strictEqual(
      voteLabels.a,
      resultLabels.a,
      `option A mismatch — vote: "${voteLabels.a}", result: "${resultLabels.a}"`
    );
  });

  it('option B label matches between vote and result services', function () {
    assert.strictEqual(
      voteLabels.b,
      resultLabels.b,
      `option B mismatch — vote: "${voteLabels.b}", result: "${resultLabels.b}"`
    );
  });
});
