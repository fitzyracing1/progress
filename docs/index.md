# @fitzyracing/progress

`@fitzyracing/progress` is a drop-in fork of [progress](https://github.com/visionmedia/node-progress) and part of [360 Bench](https://github.com/fitzyracing1/360-bench). It is based on upstream `progress@2.0.3`, and the API is unchanged. All credit for the original library goes to its authors and contributors.

## What the fork fixes (summary of [Readme.md](../Readme.md))

- No `RangeError: Invalid array length` when `total` is NaN, 0 or fractional.
- No `RangeError` when the output stream has no `columns`. An 80-column terminal is assumed instead.
- A non-numeric `width` falls back to the terminal width.
- `interrupt()` no longer throws `clearLine is not a function` when output is piped.

The full details and links to the upstream issues are in [Readme.md](../Readme.md).

Pages: [Getting started](getting-started.md) · [Architecture](architecture.md) · [Contributing](contributing.md)

This repo has no CI workflow.

## License

MIT. The original notice is kept: Copyright (c) 2017 TJ Holowaychuk.
Modifications: Copyright (c) 2026 Joshua Almeida.
