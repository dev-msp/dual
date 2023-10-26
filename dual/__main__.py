# Dual helps users rate their beets library by presenting pairs of songs and
# asking  which one they like better

import urwid
from dual.app import App, UserResponse
from dual.audio import LoadfileOption


class Referent(urwid.WidgetWrap):
    def item(self):
        return self.item


class TrackView(Referent):
    """A view of a track"""

    def __init__(self, track):
        self.item = track
        for_pile = [
            urwid.Text(('blue', track.title())),
            urwid.Text(track.album()),
            urwid.Text(('orange', track.artist())),
        ]
        if track.score():
            # round to 2
            for_pile.append(urwid.Text(f"Score: {track.score():.2f}"))
        if track.last_rated_at():
            for_pile.append(urwid.Text(track.last_rated_at().strftime(
                '%Y-%m-%d %H:%M:%S')))
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
        self.app = app
        super().__init__(urwid.Filler(urwid.Text('Loading...')))

    def selectable(self):
        return True

    def new_question(self):
        try:
            a, b = self.app.get_elimination_pair()
        except ValueError as e:
            return False
        except Exception as e:
            raise e
        except KeyboardInterrupt:
            raise urwid.ExitMainLoop()
        winner_id = self.app.winner.id() if self.app.winner else None

        cur_playing = self.app.player.get_current_track()
        if cur_playing and cur_playing.id() == winner_id:
            mode = LoadfileOption.append_play
        else:
            mode = LoadfileOption.replace

        self.app.player.enqueue_tracks(
            [t for t in [a, b] if t.id() != winner_id],
            mode=mode
        )

        self.comparison = Comparison(
            TrackView(a),
            TrackView(b)
        )
        self._w = Question(self.comparison)
        return True

    def keypress(self, size, key):
        key = super().keypress(size, key)
        return self.unhandled_input(size, key)

    def unhandled_input(self, size, key):
        key_to_response_mapping = {
            'a': UserResponse.win,
            'b': UserResponse.lose,
            'd': UserResponse.draw,
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
            raise urwid.ExitMainLoop()


def exit_on_q(key):
    if key in ('q', 'Q'):
        raise urwid.ExitMainLoop()


def main():
    app = App()

    fill = QuestionSequence(app)

    palette = [
        ('blue', 'dark blue', 'default'),
        ('orange', 'dark red', 'default'),
        ('green', 'dark green', 'default'),
    ]
    loop = urwid.MainLoop(fill, palette, unhandled_input=exit_on_q)
    loop.screen.set_terminal_properties(colors=256)
    fill.new_question()
    loop.run()
    app.mpv.kill()


if __name__ == '__main__':
    main()
