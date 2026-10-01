#!/usr/bin/env node
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';

const git = (...args) => execFileSync('git', args, {encoding: 'utf8'});
const testFile = path => /(^|\/)(__tests__|tests?)\/|\.(test|spec)\.[cm]?[jt]sx?$/.test(path);
const assertions = text => (text.match(/\b(?:assert(?:\s*\.\s*\w+)*|expect)\s*\(/g) || []).length;
const disabled = text => /\.\s*(?:skip|only|todo)\b|\b(?:xit|xdescribe|xtest)\s*\(|\b(?:skip|only|todo)\s*:\s*(?!false\b)[^\s,}]/.test(text);

// ponytail: hunk-local assertion counts catch removals, not semantic weakening
// or arbitrary aliases. Human review still owns assertion quality.
function codeOnly(text, path) {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  let result = '', end = 0;
  function visit(node) {
    if (node.kind === ts.SyntaxKind.JSDocComment) return;
    const children = node.getChildren(source);
    if (children.length) children.forEach(visit);
    else {
      const start = node.getStart(source);
      const token = text.slice(start, node.end);
      result += text.slice(end, start).replace(/[^\r\n]/g, ' ')
        + (ts.isLiteralExpression(node) || ts.isTemplateLiteralToken(node) ? token.replace(/[^\r\n]+/g, ' 0 ') : token);
      end = node.end;
    }
  }
  visit(source);
  return result;
}

function inspect(diff, path = 'test.ts') {
  const findings = [];
  for (const hunk of diff.split(/^@@ .* @@.*$/m).slice(1)) {
    const lines = hunk.split('\n').filter(line => /^[ +-]/.test(line));
    const before = codeOnly(lines.filter(line => line[0] !== '+').map(line => line.slice(1)).join('\n'), path).split('\n');
    const after = codeOnly(lines.filter(line => line[0] !== '-').map(line => line.slice(1)).join('\n'), path).split('\n');
    let oldLine = 0, newLine = 0, removed = '', added = '';
    function flush() {
      if (assertions(removed) > assertions(added)) findings.push('assertions removed without replacement');
      if (disabled(added)) findings.push('test disable/focus added');
      removed = added = '';
    }
    for (const line of lines) {
      const oldCode = line[0] === '+' ? '' : before[oldLine++];
      const newCode = line[0] === '-' ? '' : after[newLine++];
      if (line[0] === ' ' && oldCode === newCode) flush();
      else {
        removed += oldCode + '\n';
        added += newCode + '\n';
      }
    }
    flush();
  }
  return [...new Set(findings)];
}

if (process.argv[2] === '--self-test') {
  const diff = (before, after) => `@@ -1 +1 @@\n${before.split('\n').map(line => '-' + line).join('\n')}\n${after.split('\n').map(line => '+' + line).join('\n')}\n`;
  assert.deepEqual(inspect(diff('assert.equal(a, b); assert.ok(c);', 'assert.ok(c);')), ['assertions removed without replacement']);
  assert.deepEqual(inspect(diff('assert.equal(a, b);', 'assert.equal(a, c);')), []);
  assert.deepEqual(inspect(diff('', 'assert.ok(true);')), []);
  for (const added of ['test.skip("x", fn)', 'it.only("x", fn)', 'xit("x", fn)', 'xdescribe("x", fn)', 'test.todo("x")', 'test("x", {skip: true}, fn)']) {
    assert.deepEqual(inspect(diff('', added)), ['test disable/focus added']);
  }
  assert.deepEqual(inspect(diff('', 'test("x", {skip: false}, fn)')), []);
  const test = 'test("x", () => assert.equal(a, b));';
  for (const after of ['//' + test, '/*' + test + '*/', '/*\n' + test + '\n*/', '/**\n' + test + '\n*/']) {
    assert.deepEqual(inspect(diff(test, after)), ['assertions removed without replacement']);
  }
  for (const literal of [JSON.stringify(test), "'" + test + "'", '`' + test + '`', '/' + test + '/', '`head ${value} ' + test + '`', '`' + test + '${value} tail`', '`head ${value} ' + test + '${value} tail`']) {
    assert.deepEqual(inspect(diff(test, literal + ';')), ['assertions removed without replacement']);
  }
  for (const literal of ['"test.skip(\\"x\\", fn)"', "'test.only(x, fn)'", '`test.todo(x)`', '/test.skip(x)/', '`head ${value} xit(x) ${value} tail`']) {
    assert.deepEqual(inspect(diff('', literal + ';')), []);
  }
  assert.deepEqual(inspect(diff('assert.ok(a);', '`head ${assert.ok(b)} tail`;')), []);
  assert.deepEqual(inspect(diff('assert.ok(a); assert.ok(b);', '`head ${assert.ok(a)} middle ${assert.ok(b)} tail`;')), []);
  assert.deepEqual(inspect(diff('`head ${assert.ok(a)} tail`;', '`head ${value} tail`;')), ['assertions removed without replacement']);
  assert.deepEqual(inspect(diff('', '`head ${test.skip("x", fn)} tail`;')), ['test disable/focus added']);
  assert.deepEqual(inspect(diff('', 'test("x", {skip: "reason"}, fn);')), ['test disable/focus added']);
  assert.deepEqual(inspect(diff(test, '<div>' + test + '</div>;'), 'test.tsx'), ['assertions removed without replacement']);
  assert.deepEqual(inspect(diff('assert.ok(a);', '<div>{assert.ok(a)}</div>;'), 'test.tsx'), []);
  const context = ['test("x", () => {', ...Array(12).fill('  work();'), '  assert.ok(true);', '});'];
  assert.deepEqual(inspect('@@ -1,15 +1,17 @@\n+/*\n' + context.map(line => ' ' + line).join('\n') + '\n+*/\n'), ['assertions removed without replacement']);
  assert.deepEqual(inspect(diff('// assert.ok(true);', '// updated comment')), []);
  assert.deepEqual(inspect(diff('', '/* test.skip("x", fn); */')), []);
  assert.deepEqual(inspect(diff('/*\ntest.skip("x", fn);\n*/', 'test.skip("x", fn);')), ['test disable/focus added']);
  assert.deepEqual(inspect(diff(test, 'const url = "https://example.com"; ' + test)), []);
  assert.deepEqual(inspect(diff(test, 'const pattern = /[/*]/; ' + test)), []);
  assert.deepEqual(inspect(diff(test, 'const value = `/* ${assert.ok(true)} */`; ' + test)), []);
  assert.deepEqual(inspect('@@ -1,3 +1,3 @@\n-assert.ok(a);\n+work();\n unchanged();\n-work();\n+assert.ok(b);\n'), ['assertions removed without replacement']);
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
    : inspect(git('diff', '--no-ext-diff', '--no-textconv', '--no-renames', '--unified=2147483647', ancestor, 'HEAD', '--', path), path).map(finding => `${path}: ${finding}`));
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
