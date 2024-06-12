import time
from random import sample
from enum import Enum

from peewee import SQL, fn

from dual.bloom import BloomFilter
from dual.db.item import Item
from dual import elo


class UserResponse(Enum):
    """The user response to a question."""

    WIN = "win"
    LOSE = "lose"
    DRAW = "draw"

    def __float__(self):
        return {
            UserResponse.WIN: 1.0,
            UserResponse.LOSE: 0.0,
            UserResponse.DRAW: 0.5,
        }[self]


class RoundFilter(BloomFilter):
    """A bloom filter that keeps track of the rounds."""

    def __init__(self):
        """Initialize the bloom filter."""
        super().__init__(int(87e3), 30)

    def _as_string(self, ta: Item, tb: Item):
        """Convert the pair to a string."""
        aid, bid = sorted([ta.id, tb.id])
        return f"{aid}-{bid}"

    def add(self, pair: tuple[Item, Item]):
        """Add the pair to the bloom filter."""
        super().add(self._as_string(*pair))

    def possibly_contains(self, pair: tuple[Item, Item]) -> bool:
        """Check if the bloom filter possibly contains the pair."""
        return super().possibly_contains(self._as_string(*pair))


def tracks(
    limit: int = 100,
    score_range: tuple[int, int] = (0, 999999),
    order_by=fn.RANDOM(),
    not_rated_in_last: int = 900,
    **kwargs,
):
    score = SQL("score")
    last_rated_at = SQL("last_rated_at")
    cond = SQL("1=1")

    if score_range is not None:
        cond = cond & score.between(*score_range)
    if not_rated_in_last is not None:
        not_recently_rated = (
            last_rated_at.is_null() | (last_rated_at < (time.time() - not_rated_in_last))
        )
        cond = cond & not_recently_rated
    return Item.with_custom_attributes().where(cond).order_by(order_by).limit(limit)


class Strategy:
    def __init__(self, name, app):
        self.name = name
        self.app = app

    def __repr__(self):
        return f'<Strategy name={self.name}>'

    def __str__(self):
        return self.name

    def new_score(self, song1, song2, response):
        return elo.new_score(song1.score, song2.score, float(response))

    def register_rating(self, winner, loser, draw=False):
        raise NotImplementedError()

    def next_pair(self):
        raise NotImplementedError()

    def _supplement_pair(self, pair: list[Item], **kwargs) -> tuple[Item, Item]:
        """Supplement a pair of tracks with additional information."""

        if len(pair) > 2:
            raise ValueError("Pair must have at most 2 elements")

        tracks_left = 2 - len(pair)

        random_tracks = sample(list(tracks(**kwargs, limit=5).namedtuples()), tracks_left)
        pair.extend(random_tracks)
        # assert pair is 2 elements
        if len(pair) != 2:
            raise ValueError("Pair must have 2 elements")

        return tuple(pair)


class TrackResultsStrategy(Strategy):
    """Pair up songs that have previously lost up to 3 times in a row."""

    def __init__(self, name, app):
        super().__init__(name, app)
        self.rounds = RoundFilter()
        self.winners = set()
        self.losers = set()

    def register_rating(self, winner, loser, draw=False):
        self.rounds.add((winner, loser))
        self.winners.add(winner.id)
        self.losers.add(loser.id)


class KeepWinner(TrackResultsStrategy):
    """Keep the winner for the next round."""

    def __init__(self, name, app):
        super().__init__(name, app)
        self.win_counts = {}
        self.loss_counts = {}
        self.win_streak = 0
        self.loss_streak = 0

    def register_rating(self, winner, loser, draw=False):
        self.win_counts[winner.id] = self.win_counts.get(winner.id, 0) + 1
        if winner.id in self.winners:
            self.win_streak += 1
        else:
            self.win_streak = 1

        self.loss_counts[loser.id] = self.loss_counts.get(loser.id, 0) + 1
        if loser.id in self.losers:
            self.loss_streak += 1
        else:
            self.loss_streak = 1

        super().register_rating(winner, loser, draw=draw)

    @property
    def winner(self):
        return self.app.winner if self.win_streak < 3 else None


class PoolStrategy(KeepWinner):
    def __init__(self, app, query):
        super().__init__('PoolStrategy', app)
        self.pool = {t.id for t in query.namedtuples()}

    def next_pair(self, **kwargs):
        q = tracks(**kwargs, not_rated_in_last=None).where(Item.id.in_(self.pool))

        winner = self.winner or None
        for track in q.namedtuples():
            if self.win_counts.get(track.id, 0) >= 3:
                continue
            if self.loss_counts.get(track.id, 0) >= 3:
                continue

            if not winner:
                winner = track
            if track.id == winner.id or self.rounds.possibly_contains((winner, track)):
                continue
            return winner, track

        return None, None


class TopRated(TrackResultsStrategy):
    def __init__(self, app):
        super().__init__('TopRated', app)

    def next_pair(self, **kwargs):
        q = tracks(**kwargs, not_rated_in_last=1800) \
            .where(Item.id.not_in(self.winners)) \
            .order_by(SQL("score").desc()) \
            .limit(30)

        return tuple(sample(list(q.namedtuples()), 2))


class SweepLosing(TrackResultsStrategy):
    """Pair up songs that have previously lost up to 3 times in this session."""

    def __init__(self, app):
        super().__init__('SweepLosing', app)
        self.loser_counts = {}

    def register_rating(self, winner, loser, draw=False):
        super().register_rating(winner, loser, draw=draw)

        if self.loser_counts.get(loser.id, 0) >= 3:
            self.winners.discard(loser.id)
            self.losers.discard(loser.id)
            del self.loser_counts[loser.id]
        else:
            self.loser_counts[loser.id] = self.loser_counts.get(loser.id, 0) + 1

    def next_pair(self, **kwargs):
        pool = self.losers - self.winners
        q = tracks(**kwargs, limit=2)

        use_pool = False
        # pool exceeds 10, flip switch to use pool
        if len(pool) > 10:
            use_pool = True
        elif len(pool) < 2:
            use_pool = False

        if use_pool:
            q = tracks(**kwargs, not_rated_in_last=None, limit=2).where(Item.id.in_(pool))

        return tuple(q.namedtuples())
