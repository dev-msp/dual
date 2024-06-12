# Dual helps users rate their beets library by presenting pairs of songs and
# asking  which one they like better

import logging
import argparse
from datetime import datetime

import urwid

from dual.app import App
from dual.strategy import UserResponse
from dual.audio import LoadfileOption
from dual.query import Query, DateRangeQuery, FloatRangeQuery, IntRangeQuery

logging.basicConfig(
    filename='dual.log',
    level=logging.DEBUG,
    encoding='utf-8'
)


class Referent(urwid.WidgetWrap):
    """A widget that refers to an item."""

    def item(self):
        return self.item


class TrackView(Referent):
    """A view of a track."""

    def __init__(self, track):
        """Initialize the view of a track."""
        self.item = track
        for_pile = [
            urwid.Text(('blue', track.title)),
            urwid.Text(track.album),
            urwid.Text(('orange', track.artist)),
        ]
        if track.score is not None:
            logging.debug("Track %s has score %s", track.title, track.score)
            # round to 2
            for_pile.append(urwid.Text(f"Score: {track.score:.2f}"))
        if track.last_rated_at is not None:
            formatted = datetime.fromtimestamp(track.last_rated_at).strftime('%Y-%m-%d %H:%M:%S')
            for_pile.append(urwid.Text(formatted))
        if track.rating_count is not None:
            for_pile.append(urwid.Text(f"Rated {track.rating_count} times"))
        super().__init__(
            urwid.Pile(for_pile)
        )


class Comparison(urwid.Pile):
    """A comparison of two things"""

    def __init__(self, left, right):
        self.left = left
        self.right = right
        super().__init__([
            urwid.LineBox(urwid.Padding(
                self.left, align='center', width=('relative', 90))),
            urwid.LineBox(urwid.Padding(
                self.right, align='center', width=('relative', 90)))
        ])


class Question(urwid.Filler):
    """A question asking which is the better of a pair of things"""

    def __init__(self, comparison):
        self.comparison = comparison
        super().__init__(self.comparison)


class QuestionSequence(urwid.WidgetWrap):
    """A sequence of questions"""

    def __init__(self, app):
        """Initialize the question sequence."""
        self.app = app
        super().__init__(urwid.Filler(urwid.Text('Loading...')))

    def selectable(self):
        """Return whether the widget is selectable."""
        return True

    def new_question(self):
        """Get a new question."""
        try:
            a, b = self.app.get_elimination_pair()
            if a is None or b is None:
                return False
        except ValueError as e:
            logging.error(e)
            return False
        except Exception as e:
            logging.exception(e)
            raise e
        except KeyboardInterrupt:
            raise urwid.ExitMainLoop()
        winner_id = self.app.winner.id if self.app.winner else None

        cur_playing = self.app.player.get_current_track()
        if cur_playing and cur_playing.id == winner_id:
            mode = LoadfileOption.APPEND_PLAY
        else:
            mode = LoadfileOption.REPLACE

        self.app.player.enqueue_tracks(
            [t for t in [a, b] if t.id != winner_id],
            mode=mode
        )

        self.comparison = Comparison(
            TrackView(a),
            TrackView(b)
        )
        self._w = Question(self.comparison)
        return True

    def keypress(self, size, key):
        # key = super().keypress(size, key)
        return self.unhandled_input(size, key)

    def unhandled_input(self, size, key):
        key_to_response_mapping = {
            'a': UserResponse.WIN,
            'b': UserResponse.LOSE,
            'd': UserResponse.DRAW,
            'n': None
        }
        if key not in key_to_response_mapping:
            return key
        key_to_response = key_to_response_mapping[key]
        if key_to_response:
            self.app.update_ratings(
                self.comparison.left.item,
                self.comparison.right.item,
                key_to_response
            )

        if not self.new_question():
            logging.info('No more questions')
            raise urwid.ExitMainLoop()


def exit_on_q(key):
    if key in ('q', 'Q'):
        raise urwid.ExitMainLoop()


parser = argparse.ArgumentParser()

subparsers = parser.add_subparsers(
    dest='command',
    help='The command to run'
)

app_parser = subparsers.add_parser(
    'app',
    help='Run the main app'
)

app_parser.add_argument(
    '--artist',
    help='The artist to select',
    type=str,
    default=None
)

app_parser.add_argument(
    '--limit',
    help='The number of tracks to select',
    type=int,
    default=None
)

app_parser.add_argument(
    '--top',
    help='Select the top tracks, instead of random ones',
    action='store_true',
    default=False
)

query_parser = subparsers.add_parser(
    'query',
    help='Query the library'
)

query_parser.add_argument(
    'query',
    help='The query to run',
    type=str,
    nargs='+',
    default=None
)


def run_app(artist=None, limit=None, top=False):
    app = App(artist, limit, top)
    app.connect()

    fill = QuestionSequence(app)

    palette = [
        ('blue', 'dark blue', 'default'),
        ('orange', 'dark red', 'default'),
        ('green', 'dark green', 'default'),
    ]
    loop = urwid.MainLoop(fill, palette, unhandled_input=exit_on_q)
    loop.screen.set_terminal_properties(colors=256)
    fill.new_question()
    logging.info('Starting main loop')
    loop.run()
    logging.info('Main loop exited')
    app.mpv.kill()
    logging.info('Exiting')


def main():
    args = parser.parse_args()
    if args.command == 'app':
        run_app(
            artist=args.artist,
            limit=args.limit,
            top=args.top
        )
    elif args.command == 'query':
        print(args.query)
        q = Query(field_type_mapping={
            'score': FloatRangeQuery,
            'rating_count': IntRangeQuery,
            'last_rated_at': DateRangeQuery,
            'added': DateRangeQuery,
            'year': IntRangeQuery,

        })
        q.parse(' '.join(args.query))
        print(q)
    else:
        print(f"Unknown command {args.command}")


if __name__ == '__main__':
    main()
