'use strict';

// Minimal regression tests. Run with `npm test` (uses the built-in node:test
// runner, Node.js 18+; no dependencies).

var test = require('node:test');
var assert = require('node:assert');
var ProgressBar = require('..');

var WIN = process.platform === 'win32' ? 1 : 0;

// A fake TTY stream that records what the bar draws.
function ttyStream(columns) {
  return {
    isTTY: true,
    columns: columns,
    out: '',
    cursorTo: function () {},
    clearLine: function () {},
    write: function (s) { this.out += s; }
  };
}

// A fake non-TTY stream (like a pipe or a file): no cursorTo/clearLine.
function pipeStream() {
  return {
    out: '',
    write: function (s) { this.out += s; }
  };
}

test('renders a normal bar exactly as before', function () {
  var stream = ttyStream(80);
  var bar = new ProgressBar('[:bar] :current/:total :percent', {
    total: 10, width: 10, stream: stream, renderThrottle: 0
  });
  for (var i = 0; i < 5; i++) bar.tick();
  assert.strictEqual(bar.lastDraw, '[=====-----] 5/10 50%');
  for (i = 0; i < 5; i++) bar.tick();
  assert.strictEqual(bar.lastDraw, '[==========] 10/10 100%');
  assert.strictEqual(bar.complete, true);
});

test('head option and width defaulting to total still work', function () {
  var stream = ttyStream(80);
  var bar = new ProgressBar('[:bar]', {
    total: 8, head: '>', stream: stream, renderThrottle: 0
  });
  bar.tick(3);
  assert.strictEqual(bar.lastDraw, '[==>-----]');
});

test('bar is still shrunk to fit the terminal width', function () {
  var stream = ttyStream(20);
  var bar = new ProgressBar('[:bar]', { total: 100, stream: stream, renderThrottle: 0 });
  bar.tick(50);
  assert.strictEqual(bar.lastDraw.length, 20 - WIN);
});

// https://github.com/visionmedia/node-progress/issues/166
test('#166: total is NaN (e.g. missing content-length) does not throw', function () {
  var stream = ttyStream(80);
  var total = parseInt(undefined, 10); // NaN, as with a missing Content-Length
  var bar = new ProgressBar('downloading [:bar] :percent', {
    total: total, width: 20, stream: stream, renderThrottle: 0
  });
  assert.doesNotThrow(function () { bar.tick(1024); });
  assert.strictEqual(bar.lastDraw, 'downloading [--------------------] 0%');
});

test('#166: total is NaN and no width given does not throw', function () {
  var stream = ttyStream(40);
  var bar = new ProgressBar('[:bar]', { total: NaN, stream: stream, renderThrottle: 0 });
  assert.doesNotThrow(function () { bar.tick(); });
  assert.strictEqual(bar.lastDraw, '[' + Array(39 - WIN).join('-') + ']');
});

test('#166: total is 0 does not throw and the bar completes', function () {
  var stream = ttyStream(80);
  var bar = new ProgressBar('[:bar] :percent', { total: 0, width: 10, stream: stream });
  assert.doesNotThrow(function () { bar.tick(0); });
  assert.strictEqual(bar.complete, true);
  assert.strictEqual(bar.lastDraw, '[==========] 100%');
});

test('#166: stream without `columns` (forced TTY / piped) does not throw', function () {
  var stream = ttyStream(undefined);
  var bar = new ProgressBar('[:bar] :percent', { total: 10, width: 10, stream: stream, renderThrottle: 0 });
  assert.doesNotThrow(function () { bar.tick(5); });
  assert.strictEqual(bar.lastDraw, '[=====-----] 50%');
});

test('#166: stream without `columns` and NaN total falls back to 80 columns', function () {
  var stream = ttyStream(undefined);
  var bar = new ProgressBar('[:bar]', { total: NaN, stream: stream, renderThrottle: 0 });
  assert.doesNotThrow(function () { bar.tick(); });
  assert.strictEqual(bar.lastDraw.length, 80 - WIN);
});

test('#166: fractional total (no width) does not throw', function () {
  var stream = ttyStream(80);
  var bar = new ProgressBar('[:bar]', { total: 10.5, stream: stream, renderThrottle: 0 });
  assert.doesNotThrow(function () { bar.tick(5); });
  assert.strictEqual(bar.lastDraw, '[=====-----]');
});

// https://github.com/visionmedia/node-progress/pull/205
test('#205: non-numeric width falls back to the available space', function () {
  var stream = ttyStream(30);
  var bar = new ProgressBar('[:bar]', { total: 10, width: 'wide', stream: stream, renderThrottle: 0 });
  assert.doesNotThrow(function () { bar.tick(5); });
  assert.strictEqual(bar.lastDraw.length, 30 - WIN);
});

// https://github.com/visionmedia/node-progress/issues/224
test('#224: interrupt() on a non-TTY stream does not throw', function () {
  var stream = pipeStream();
  var bar = new ProgressBar('[:bar]', { total: 10, stream: stream });
  bar.tick();
  assert.doesNotThrow(function () { bar.interrupt('hello'); });
  assert.strictEqual(stream.out, 'hello\n');
});

test('interrupt() on a TTY still redraws the bar below the message', function () {
  var stream = ttyStream(80);
  var bar = new ProgressBar('[:bar]', { total: 4, width: 4, stream: stream, renderThrottle: 0 });
  bar.tick();
  stream.out = '';
  bar.interrupt('hello');
  assert.strictEqual(stream.out, 'hello\n[=---]');
});

test('non-TTY stream: tick to completion only writes the final newline', function () {
  var stream = pipeStream();
  var bar = new ProgressBar('[:bar]', { total: 3, stream: stream });
  bar.tick(); bar.tick(); bar.tick();
  assert.strictEqual(bar.complete, true);
  assert.strictEqual(stream.out, '\n');
});
