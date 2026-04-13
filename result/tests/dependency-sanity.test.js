import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));

const isSemver = (v) => /^\d+\.\d+\.\d+(-.+)?$/.test(v);

test('dependencies should exist', () => {
  assert.ok(pkg.dependencies, 'No dependencies field found');
  assert.ok(Object.keys(pkg.dependencies).length > 0, 'Dependencies are empty');
});

test('all dependencies should have valid semver versions', () => {
  for (const [name, version] of Object.entries(pkg.dependencies)) {
    assert.ok(isSemver(version), `Invalid version for ${name}: ${version}`);
  }
});

test('no duplicate dependencies across sections', () => {
  const deps = new Set(Object.keys(pkg.dependencies || {}));
  const devDeps = new Set(Object.keys(pkg.devDependencies || {}));

  for (const dep of deps) {
    assert.ok(!devDeps.has(dep), `Duplicate dependency in dependencies and devDependencies: ${dep}`);
  }
});

test('no empty dependency names or versions', () => {
  for (const [name, version] of Object.entries(pkg.dependencies)) {
    assert.ok(name.trim().length > 0, 'Empty dependency name');
    assert.ok(version.trim().length > 0, `Empty version for ${name}`);
  }
});

test('critical dependencies should be present', () => {
  const required = ['express', 'pg', 'socket.io'];

  required.forEach(dep => {
    assert.ok(pkg.dependencies[dep], `Missing critical dependency: ${dep}`);
  });
});