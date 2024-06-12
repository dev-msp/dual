# dual

This is a simple command-line application that uses [ELO scoring](https://en.wikipedia.org/wiki/Elo_rating_system) and other methods to allow users to rank their music library (currently limited to [beets](https://beets.readthedocs.io/en/stable/index.html) libraries) track by track in relative terms.

## Install

- Clone the project and run pip install '.[dev]' in the project directory.

## Usage

Currently the application assumes that your beets library is located at `$XDG_CONFIG_HOME/beets/library.db`.

```
usage: python -m dual app [-h] [--artist ARTIST] [--limit LIMIT] [--top]

options:
-h, --help       show this help message and exit
--artist ARTIST  The artist to select
--limit LIMIT    The number of tracks to select
--top            Select the top tracks, instead of random ones
```

### Key bindings

- `a` - First track wins
- `b` - Second track wins
- `d` - Draw
- `n` - Skip
- `q` - Quit
