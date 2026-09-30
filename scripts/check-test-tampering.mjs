#!/usr/bin/env node
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

const git = (...args) => execFileSync('git', args, {encoding: 'utf8'});
const testFile = path => /(^|\/)(__tests__|tests?)\/|\.(test|spec)\.[cm]?[jt]sx?$/.test(path);
const assertions = text => (text.match(/\b(?:assert(?:\s*\.\s*\w+)*|expect)\s*\(/g) || []).length;
const disabled = text => /\.\s*(?:skip|only|todo)\b|\b(?:xit|xdescribe|xtest)\s*\(|\b(?:skip|only|todo)\s*:\s*(?!false\b)[^\s,}]/.test(text);

// ponytail: hunk-local assertion counts catch removals, not semantic weakening
// or arbitrary aliases. Human review still owns assertion quality.
function inspect(diff) {
  const findings = [];
  for (const hunk of diff.split(/^@@ .* @@.*$/m).slice(1)) {
    const lines = hunk.split('\n');
    const added = lines.filter(line => line.startsWith('+')).map(line => line.slice(1)).join('\n');
    const removed = lines.filter(line => line.startsWith('-')).map(line => line.slice(1)).join('\n');
    if (assertions(removed) > assertions(added)) findings.push('assertions removed without replacement');
    if (disabled(added)) findings.push('test disable/focus added');
  }
  return findings;
}

if (process.argv[2] === '--self-test') {
  const diff = (before, after) => `@@ -1 +1 @@\n-${before}\n+${after}\n`;
  assert.deepEqual(inspect(diff('assert.equal(a, b); assert.ok(c);', 'assert.ok(c);')), ['assertions removed without replacement']);
  assert.deepEqual(inspect(diff('assert.equal(a, b);', 'assert.equal(a, c);')), []);
  assert.deepEqual(inspect(diff('', 'assert.ok(true);')), []);
  for (const added of ['test.skip("x", fn)', 'it.only("x", fn)', 'xit("x", fn)', 'xdescribe("x", fn)', 'test.todo("x")', 'test("x", {skip: true}, fn)']) {
    assert.deepEqual(inspect(diff('', added)), ['test disable/focus added']);
  }
  assert.deepEqual(inspect(diff('', 'test("x", {skip: false}, fn)')), []);
  assert.equal(testFile('tests/name with spaces.ts'), true);
  assert.equal(testFile('src/example.spec.tsx'), true);
  assert.equal(testFile('src/api.ts'), false);
  console.log('test-tampering self-check passed');
} else {
  const base = process.argv[2] || 'origin/main';
  // Resolve the merge base first so missing refs/history fail closed.
  const ancestor = git('merge-base', base, 'HEAD').trim();
  const changed = git('diff', '--no-renames', '--name-only', '-z', ancestor, 'HEAD').split('\0').filter(testFile);
  const deleted = new Set(git('diff', '--no-renames', '--diff-filter=D', '--name-only', '-z', ancestor, 'HEAD').split('\0'));
  const findings = changed.flatMap(path => deleted.has(path)
    ? [`${path}: test file deleted`]
    : inspect(git('diff', '--no-ext-diff', '--no-textconv', '--no-renames', '--unified=0', ancestor, 'HEAD', '--', path)).map(finding => `${path}: ${finding}`));
  if (findings.length) {
    console.error(findings.join('\n'));
    // Only the current head's trailer approves this exact aggregate change.
    // This is an owner convention, not cryptographic identity verification.
    const trailers = git('show', '-s', '--format=%(trailers:key=Test-change-approved,valueonly)', 'HEAD').trim();
    if (trailers) console.log('Test-change-approved trailer present; owner approval required in review.');
    else {
      console.error('Owner action required: supply a Test-change-approved: <reason> commit trailer after review.');
      process.exitCode = 1;
    }
  } else console.log(`test-tampering passed (${changed.length} changed test files)`);
}
