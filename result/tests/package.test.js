import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));

test('should have a name', () => {
  assert.ok(pkg.name);
  assert.strictEqual(typeof pkg.name, 'string');
});

test('should have a version in semver format', () => {
  assert.ok(pkg.version);
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
});

test('should define main entry file', () => {
  assert.ok(pkg.main);
  assert.strictEqual(pkg.main, 'server.js');
});

test('should have a test script', () => {
  assert.ok(pkg.scripts);
  assert.ok(pkg.scripts.test);
  assert.match(pkg.scripts.test, /node --test/);
});

test('should have a license', () => {
  assert.ok(pkg.license);
  assert.strictEqual(pkg.license, 'MIT');
});

test('should have dependencies defined', () => {
  assert.ok(pkg.dependencies);
  assert.ok(Object.keys(pkg.dependencies).length > 0);
});

test('should include required dependencies', () => {
  const requiredDeps = [
    'express',
    'pg',
    'socket.io'
  ];

  requiredDeps.forEach(dep => {
    assert.ok(pkg.dependencies[dep], `Missing dependency: ${dep}`);
  });
});