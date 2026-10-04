#!/usr/bin/env node
import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ts from 'typescript';

const git = (...args) => execFileSync('git', args, {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
const testFile = path => /\.[cm]?[jt]sx?$/.test(path) && /(^|\/)(__tests__|tests?)\/|\.(test|spec)\.[cm]?[jt]sx?$/.test(path);

function inspectSource(text, path) {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const assertions = new Map(), disabled = new Map();
  const mark = (set, node) => {
    const first = source.getLineAndCharacterOfPosition(node.getStart(source)).line;
    const last = source.getLineAndCharacterOfPosition(node.end - 1).line;
    for (let line = first; line <= last; line++) set.set(line, [...(set.get(line) || []), node.getText(source)]);
  };
  const name = node => ts.isComputedPropertyName(node) ? name(node.expression) : node.text;
  const disabling = node => /^(skip|only|todo)$/.test(name(node));
  const testAPI = node => {
    while (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) node = node.expression;
    return ts.isIdentifier(node) && /^(test|it|describe|suite|t)$/.test(node.text);
  };
  function visit(node) {
    if (ts.isCallExpression(node)) {
      let target = node.expression;
      while (ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target)) target = target.expression;
      if (ts.isIdentifier(target) && /^(assert|expect)$/.test(target.text)) {
        let call = node;
        while (call.parent && call.parent.expression === call) call = call.parent;
        mark(assertions, call);
      }
      if (ts.isIdentifier(node.expression) && /^(xit|xdescribe|xtest)$/.test(node.expression.text)) mark(disabled, node.expression);
    }
    if (ts.isPropertyAccessExpression(node) && testAPI(node.expression) && disabling(node.name)) mark(disabled, node);
    if (ts.isElementAccessExpression(node) && testAPI(node.expression) && disabling(node.argumentExpression)) mark(disabled, node);
    if (ts.isPropertyAssignment(node) && disabling(node.name) && node.initializer.kind !== ts.SyntaxKind.FalseKeyword) mark(disabled, node);
    if (ts.isShorthandPropertyAssignment(node) && disabling(node.name)) mark(disabled, node);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return {assertions, disabled};
}

function inspect(diff, path = 'test.ts') {
  const findings = new Set();
  for (const hunk of diff.split(/^@@ .* @@.*$/m).slice(1)) {
    const lines = hunk.split('\n').filter(line => /^[ +-]/.test(line));
    const before = inspectSource(lines.filter(line => line[0] !== '+').map(line => line.slice(1)).join('\n'), path);
    const after = inspectSource(lines.filter(line => line[0] !== '-').map(line => line.slice(1)).join('\n'), path);
    let oldLine = 0, newLine = 0;
    for (const line of lines) {
      if (line[0] !== '+' && before.assertions.has(oldLine) && (line[0] === '-' || before.assertions.get(oldLine).some(call => !after.assertions.get(newLine)?.includes(call)))) findings.add('assertion line removed or modified');
      if (line[0] !== '-' && after.disabled.has(newLine) && (line[0] === '+' || !before.disabled.has(oldLine))) findings.add('test disable/focus added');
      if (line[0] !== '+') oldLine++;
      if (line[0] !== '-') newLine++;
    }
  }
  return [...findings];
}

if (process.argv[2] === '--self-test') {
  const diff = (before, after) => `@@ -1 +1 @@\n${before.split('\n').map(line => '-' + line).join('\n')}\n${after.split('\n').map(line => '+' + line).join('\n')}\n`;
  assert.deepEqual(inspect(diff('assert.equal(a, b); assert.ok(c);', 'assert.ok(c);')), ['assertion line removed or modified']);
  assert.deepEqual(inspect(diff('assert.equal(a, b);', 'assert.equal(a, c);')), ['assertion line removed or modified']);
  assert.deepEqual(inspect(diff('', 'assert.ok(true);')), []);
  for (const added of ['test.skip("x", fn)', 'it.only("x", fn)', 'xit("x", fn)', 'xdescribe("x", fn)', 'test.todo("x")', 'test("x", {skip: true}, fn)']) {
    assert.deepEqual(inspect(diff('', added)), ['test disable/focus added']);
  }
  assert.deepEqual(inspect(diff('', 'test("x", {skip: false}, fn)')), []);
  const test = 'test("x", () => assert.equal(a, b));';
  for (const after of ['//' + test, '/*' + test + '*/', '/*\n' + test + '\n*/', '/**\n' + test + '\n*/']) {
    assert.deepEqual(inspect(diff(test, after)), ['assertion line removed or modified']);
  }
  for (const literal of [JSON.stringify(test), "'" + test + "'", '`' + test + '`', '/' + test + '/', '`head ${value} ' + test + '`', '`' + test + '${value} tail`', '`head ${value} ' + test + '${value} tail`']) {
    assert.deepEqual(inspect(diff(test, literal + ';')), ['assertion line removed or modified']);
  }
  for (const literal of ['"test.skip(\\"x\\", fn)"', "'test.only(x, fn)'", '`test.todo(x)`', '/test.skip(x)/', '`head ${value} xit(x) ${value} tail`']) {
    assert.deepEqual(inspect(diff('', literal + ';')), []);
  }
  assert.deepEqual(inspect(diff('assert.ok(a);', '`head ${assert.ok(b)} tail`;')), ['assertion line removed or modified']);
  assert.deepEqual(inspect(diff('assert.ok(a); assert.ok(b);', '`head ${assert.ok(a)} middle ${assert.ok(b)} tail`;')), ['assertion line removed or modified']);
  assert.deepEqual(inspect(diff('`head ${assert.ok(a)} tail`;', '`head ${value} tail`;')), ['assertion line removed or modified']);
  assert.deepEqual(inspect(diff('', '`head ${test.skip("x", fn)} tail`;')), ['test disable/focus added']);
  assert.deepEqual(inspect(diff('', 'test("x", {skip: "reason"}, fn);')), ['test disable/focus added']);
  assert.deepEqual(inspect(diff(test, '<div>' + test + '</div>;'), 'test.tsx'), ['assertion line removed or modified']);
  assert.deepEqual(inspect(diff('assert.ok(a);', '<div>{assert.ok(a)}</div>;'), 'test.tsx'), ['assertion line removed or modified']);
  const context = ['test("x", () => {', ...Array(12).fill('  work();'), '  assert.ok(true);', '});'];
  assert.deepEqual(inspect('@@ -1,15 +1,17 @@\n+/*\n' + context.map(line => ' ' + line).join('\n') + '\n+*/\n'), ['assertion line removed or modified']);
  assert.deepEqual(inspect(diff('// assert.ok(true);', '// updated comment')), []);
  assert.deepEqual(inspect(diff('', '/* test.skip("x", fn); */')), []);
  assert.deepEqual(inspect(diff('/*\ntest.skip("x", fn);\n*/', 'test.skip("x", fn);')), ['test disable/focus added']);
  assert.deepEqual(inspect(diff(test, 'const url = "https://example.com"; ' + test)), ['assertion line removed or modified']);
  assert.deepEqual(inspect(diff(test, 'const pattern = /[/*]/; ' + test)), ['assertion line removed or modified']);
  assert.deepEqual(inspect(diff(test, 'const value = `/* ${assert.ok(true)} */`; ' + test)), ['assertion line removed or modified']);
  assert.deepEqual(inspect('@@ -1,3 +1,3 @@\n-assert.ok(a);\n+work();\n unchanged();\n-work();\n+assert.ok(b);\n'), ['assertion line removed or modified']);
  for (const option of ['skip', 'only', 'todo', '"skip"', '["only"]']) {
    assert.deepEqual(inspect(`@@ -1,3 +1,3 @@\n test('x', {${option}:\n- false\n+ true\n }, fn)\n`), ['test disable/focus added']);
    assert.deepEqual(inspect(`@@ -1,3 +1,3 @@\n test('x', {${option}:\n- true\n+ false\n }, fn)\n`), []);
  }
  assert.deepEqual(inspect('@@ -1,3 +1,3 @@\n test\n- ("x", fn);\n+ .skip("x", fn);\n'), ['test disable/focus added']);
  assert.deepEqual(inspect('@@ -1,3 +1,3 @@\n assert.equal(\n- actual, expected\n+ actual, other\n );\n'), ['assertion line removed or modified']);
  assert.deepEqual(inspect('@@ -1,3 +1,3 @@\n expect(actual)\n  .toEqual(\n- expected);\n+ other);\n'), ['assertion line removed or modified']);
  assert.deepEqual(inspect('@@ -1,2 +1,3 @@\n test.skip("old", fn);\n assert.ok(a);\n+assert.ok(b);\n'), []);
  assert.deepEqual(inspect(diff('', 'const value = `text ${assert.ok(true)}`;')), []);
  assert.deepEqual(inspect('@@ -1,2 +1,3 @@\n expect(actual)\n+ .not\n  .toEqual(expected);\n'), ['assertion line removed or modified']);
  assert.deepEqual(inspect('@@ -1 +1,2 @@\n+assert.ok(b);\n assert.ok(a);\n'), []);
  assert.deepEqual(inspect(diff('', 'test("x", {skip}, fn);')), ['test disable/focus added']);
  assert.equal(testFile('tests/fixture.json'), false);
  assert.equal(testFile('tests/name with spaces.ts'), true);
  assert.equal(testFile('src/example.spec.tsx'), true);
  assert.equal(testFile('src/api.ts'), false);
  assert.deepEqual(inspect(diff('', 'const value = config.skip;')), []);
  assert.deepEqual(inspect(diff('', 'const value = config["only"];')), []);
  assert.deepEqual(inspect(diff('', 'const disabled = test.skip;')), ['test disable/focus added']);
  const fixture = mkdtempSync(join(tmpdir(), 'test-tampering-'));
  const fixtureGit = (...args) => execFileSync('git', args, {cwd: fixture, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024}).trim();
  try {
    fixtureGit('init', '-q');
    fixtureGit('config', 'user.name', 'Test fixture');
    fixtureGit('config', 'user.email', 'fixture@example.invalid');
    fixtureGit('commit', '--allow-empty', '-qm', 'base');
    const base = fixtureGit('rev-parse', 'HEAD');
    mkdirSync(join(fixture, 'tests'));
    for (const [source, expected] of [['test.only("x", fn);', 1], ['test.skip("x", fn);', 1], ['test("x", fn);', 0]]) {
      writeFileSync(join(fixture, 'tests/new.test.ts'), source + '\n');
      fixtureGit('add', '.');
      fixtureGit('commit', '-qm', 'new test');
      const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), base], {cwd: fixture, encoding: 'utf8'});
      assert.equal(result.status, expected, result.stdout + result.stderr);
      if (expected) assert.match(result.stderr, /test disable\/focus added/);
    }
  } finally {
    rmSync(fixture, {recursive: true, force: true});
  }
  console.log('test-tampering self-check passed');
} else {
  const base = process.argv[2] || 'origin/main';
  // Resolve the merge base first so missing refs/history fail closed.
  const ancestor = git('merge-base', base, 'HEAD').trim();
  const changed = git('diff', '--no-renames', '--diff-filter=ADM', '--name-only', '-z', ancestor, 'HEAD').split('\0').filter(testFile);
  const deleted = new Set(git('diff', '--no-renames', '--diff-filter=D', '--name-only', '-z', ancestor, 'HEAD').split('\0'));
  const findings = changed.flatMap(path => deleted.has(path)
    ? [`${path}: test file deleted`]
    : inspect(git('diff', '--no-ext-diff', '--no-textconv', '--no-renames', '--unified=2147483647', ancestor, 'HEAD', '--', path), path).map(finding => `${path}: ${finding}`));
  if (findings.length) {
    console.error(findings.join('\n'));
    console.error('Owner action required: review the findings through the gate.');
    process.exitCode = 1;
  } else console.log(`test-tampering passed (${changed.length} changed test files)`);
}
