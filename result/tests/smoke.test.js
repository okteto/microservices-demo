'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

test('result package exposes a main entry', () => {
  const pkg = require('../package.json');
  assert.equal(pkg.main, 'server.js');
});

test('express is listed as a dependency', () => {
  const pkg = require('../package.json');
  assert.ok(pkg.dependencies && pkg.dependencies.express);
});