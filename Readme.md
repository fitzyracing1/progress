# @fitzyracing/progress

Flexible ascii progress bar.

[![npm](https://img.shields.io/npm/v/@fitzyracing/progress.svg)](https://www.npmjs.com/package/@fitzyracing/progress)

> **This is a fork of [progress](https://github.com/visionmedia/node-progress)
> by [TJ Holowaychuk](https://github.com/tj)** and its contributors, published as a
> drop-in replacement that fixes long-standing crashes. The upstream package has not
> been released since v2.0.3 (December 2018), and the reported crash bugs below are
> still open. All credit for the original library goes to its author and
> contributors; it remains available under the same MIT license.


## What's fixed in this fork

Based on upstream `progress@2.0.3`; the API and the normal output are unchanged.

- **No more `RangeError: Invalid array length` when `total` is not a usable number.**
  The classic case is a download progress bar built with
  `total: parseInt(res.headers['content-length'], 10)` when the server sends no
  `Content-Length` (chunked responses, many CDNs), which makes `total` `NaN`. The bar
  now renders as empty (0%) instead of killing the process. A `total` of `0` no
  longer crashes either (the bar completes at 100%), nor does a fractional `total`
  such as `10.5` when no `width` is given.
  Upstream issue: [#166](https://github.com/visionmedia/node-progress/issues/166)
  (also reported in [#171](https://github.com/visionmedia/node-progress/pull/171)).
- **No more `RangeError: Invalid array length` when the output stream has no
  `columns`.** This happens when a piped/non-terminal stream is forced into TTY mode
  (the workaround suggested in upstream
  [#110](https://github.com/visionmedia/node-progress/issues/110) and
  [#179](https://github.com/visionmedia/node-progress/issues/179)) or with custom
  streams. The bar now assumes an 80-column terminal in that case.
  Upstream issue: [#166](https://github.com/visionmedia/node-progress/issues/166).
- **A `width` that is not a number now falls back to the available terminal width**
  instead of crashing, as proposed in upstream PR
  [#205](https://github.com/visionmedia/node-progress/pull/205).
- **No more `TypeError: this.stream.clearLine is not a function` when calling
  `interrupt()` while output is piped or redirected to a file.** The message is
  written as a plain line instead, the same way upstream already handles
  `terminate()` (fixed there in [#144](https://github.com/visionmedia/node-progress/pull/144)).
  Upstream issue: [#224](https://github.com/visionmedia/node-progress/issues/224).


## Installation

```bash
$ npm install @fitzyracing/progress
```

### Using it as a drop-in replacement

`progress` is mostly installed as a transitive dependency of CLI tools. To make your
whole dependency tree use this fork without changing any code, add an override to
your `package.json`:

```json
{
  "overrides": {
    "progress": "npm:@fitzyracing/progress@^2.0.4"
  }
}
```

(Yarn: use `"resolutions"`; pnpm: `"pnpm": { "overrides": { ... } }`. Tested with npm 10 and 11;
very early npm 9 releases such as 9.2.0 reject aliased overrides with "Invalid comparator", so upgrade npm if you see that.)

Or alias it directly in your own dependencies, so `require('progress')` keeps working:

```bash
$ npm install progress@npm:@fitzyracing/progress
```

### TypeScript

Types for `progress` live in [`@types/progress`](https://www.npmjs.com/package/@types/progress)
and this fork does not change the API. With the override or the alias above, the package is
still installed as `progress`, so `@types/progress` keeps working unchanged.

If you import the scoped name directly (`import ProgressBar = require('@fitzyracing/progress')`),
install `@types/progress` and add a small declaration file to your project:

```ts
// progress-fork.d.ts
declare module '@fitzyracing/progress' {
  import ProgressBar = require('progress');
  export = ProgressBar;
}
```

## Usage

First we create a `ProgressBar`, giving it a format string
as well as the `total`, telling the progress bar when it will
be considered complete. After that all we need to do is `tick()` appropriately.

```javascript
var ProgressBar = require('@fitzyracing/progress');

var bar = new ProgressBar(':bar', { total: 10 });
var timer = setInterval(function () {
  bar.tick();
  if (bar.complete) {
    console.log('\ncomplete\n');
    clearInterval(timer);
  }
}, 100);
```

### Options

These are keys in the options object you can pass to the progress bar along with
`total` as seen in the example above.

- `curr` current completed index
- `total` total number of ticks to complete
- `width` the displayed width of the progress bar defaulting to total
- `stream` the output stream defaulting to stderr
- `head` head character defaulting to complete character
- `complete` completion character defaulting to "="
- `incomplete` incomplete character defaulting to "-"
- `renderThrottle` minimum time between updates in milliseconds defaulting to 16
- `clear` option to clear the bar on completion defaulting to false
- `callback` optional function to call when the progress bar completes

### Tokens

These are tokens you can use in the format of your progress bar.

- `:bar` the progress bar itself
- `:current` current tick number
- `:total` total ticks
- `:elapsed` time elapsed in seconds
- `:percent` completion percentage
- `:eta` estimated completion time in seconds
- `:rate` rate of ticks per second

### Custom Tokens

You can define custom tokens by adding a `{'name': value}` object parameter to your method (`tick()`, `update()`, etc.) calls.

```javascript
var bar = new ProgressBar(':current: :token1 :token2', { total: 3 })
bar.tick({
  'token1': "Hello",
  'token2': "World!\n"
})
bar.tick(2, {
  'token1': "Goodbye",
  'token2': "World!"
})
```
The above example would result in the output below.

```
1: Hello World!
3: Goodbye World!
```

## Examples

### Download

In our download example each tick has a variable influence, so we pass the chunk
length which adjusts the progress bar appropriately relative to the total
length.

```javascript
var ProgressBar = require('@fitzyracing/progress');
var https = require('https');

var req = https.request({
  host: 'download.github.com',
  port: 443,
  path: '/visionmedia-node-jscoverage-0d4608a.zip'
});

req.on('response', function(res){
  var len = parseInt(res.headers['content-length'], 10);

  console.log();
  var bar = new ProgressBar('  downloading [:bar] :rate/bps :percent :etas', {
    complete: '=',
    incomplete: ' ',
    width: 20,
    total: len
  });

  res.on('data', function (chunk) {
    bar.tick(chunk.length);
  });

  res.on('end', function () {
    console.log('\n');
  });
});

req.end();
```

The above example result in a progress bar like the one below.

```
downloading [=====             ] 39/bps 29% 3.7s
```

### Interrupt

To display a message during progress bar execution, use `interrupt()`
```javascript
var ProgressBar = require('@fitzyracing/progress');

var bar = new ProgressBar(':bar :current/:total', { total: 10 });
var timer = setInterval(function () {
  bar.tick();
  if (bar.complete) {
    clearInterval(timer);
  } else if (bar.curr === 5) {
      bar.interrupt('this message appears above the progress bar\ncurrent progress is ' + bar.curr + '/' + bar.total);
  }
}, 1000);
```

You can see more examples in the `examples` folder.

## Security contact

To report a security vulnerability in this fork, please use
[GitHub private vulnerability reporting](https://github.com/fitzyracing1/progress/security/advisories/new)
rather than a public issue.

## License

[MIT](./LICENSE) - Copyright (c) 2017 TJ Holowaychuk. The original license and
copyright notice are retained unchanged; fork changes are released under the same license.

Original project: https://github.com/visionmedia/node-progress
