"""The Dual app."""

import logging

from peewee import SQL, Case, fn

import dual.strategy as sgy
from dual.audio import MpvClient
from dual.audio.player import Player
from dual.db.item import Item
from dual.strategy.bisect import Bisect


def log(func):
    """Log the function call."""

    def wrapper(*args, **kwargs):
        logging.debug("Calling %s with %s %s", func.__name__, args, kwargs)
        return func(*args, **kwargs)

    return wrapper


# different rating strategies:
# - pure random
# - get bottom N% of songs and order by least recently rated
# - get top N% of songs and order by least recently rated

def unrated_tracks_from_rated_albums():
    cxitem = Item.with_custom_attributes().where(SQL('variant').is_null())
    is_rated = SQL('last_rated_at').is_null(False)

    rated_count = fn.SUM(Case(is_rated, ((1, 1),), 0)).cast('float')
    total_count = fn.COUNT(1 == 1).cast('float')

    albums = cxitem.select(
        Item.albumartist,
        Item.album,
        total_count.alias('total_count'),
        ((rated_count / total_count) * 100).alias('percent_rated')
    ).group_by(Item.albumartist, Item.album).order_by(SQL('percent_rated').desc())
    albs = albums.alias('albs')
    pred = ((Item.albumartist == albs.c.albumartist) & (Item.album == albs.c.album))

    return cxitem.join(albs, on=pred) \
        .where(~is_rated & (SQL('percent_rated') < 100)) \
        .order_by(SQL('percent_rated').desc()).limit(100)


class App:
    """The Dual app."""

    def __init__(self, artist=None, limit=None, top=False):
        """Initialize the app."""
        logging.debug("Initializing app...")
        self.artist = artist
        self.limit = limit
        self.top = top
        self.mpv = None
        self.player = None
        self.max_consecutive_wins = 5
        self._wins = 0
        self._winner = None
        self.strategy = Bisect(self)
        # self.strategy = sgy.PoolStrategy(
        #     self, Item.with_custom_attributes()
        #     .where((Item.albumartist == 'Radiohead') & (Item.album == 'A Moon Shaped Pool'))
        # )
        logging.debug("Initialized app")

    def __repr__(self):
        """Get the string representation of the app."""
        return "<App strategy={}>".format(self.strategy)

    @property
    def wins(self) -> int:
        """Get the current winning streak."""
        return self._wins

    @property
    def winner(self) -> Item | None:
        """Get the winner of the last question."""
        return self._winner

    @winner.setter
    def winner(self, track: Item):
        """Set the winner of the last question."""
        # reset the winner and streak if the value is None or streak is maxed
        if track is None:
            self._wins = 0
            self._winner = None

        if self._winner is not None and track.id == self._winner.id:
            if self._wins >= self.max_consecutive_wins:
                self._wins = 0
                self._winner = None
                return
            # increment the streak if the winner is the same
            self._wins += 1
        else:
            # reset the streak if the winner is different
            self._wins = 1
            self._winner = track

    @winner.deleter
    def winner(self):
        """Delete the winner of the last question."""
        self._wins = 0
        self._winner = None

    def refine_query(self, query):
        """Refine the query."""
        query = query.where((SQL("variant").is_null(True)))
        if self.artist:
            query = query.where((Item.albumartist == self.artist))
        if self.limit:
            query = query.limit(self.limit)
        if self.top:
            query = query.order_by(SQL("score").desc())
        return query

    def connect(self):
        """Connect to the mpv socket."""
        if self.player is not None:
            return
        self.mpv = MpvClient()
        self.player = Player(self.mpv)

    def get_elimination_pair(self) -> tuple[Item, Item]:
        return self.strategy.next_pair()

    def update_ratings(self, song1: Item, song2: Item, user_response: sgy.UserResponse):
        """
        Update the ratings.

        Args:
            song1 (Track): song1
            song2 (Track): song2
            user_response (str): the outcome for song 1
        """

        song1_score, song2_score = self.strategy.new_score(song1, song2, user_response)
        Item.get_by_id(song1.id).update_score(song1_score)
        Item.get_by_id(song2.id).update_score(song2_score)

        song1 = Item.namedtuple_from_id(song1.id)
        song2 = Item.namedtuple_from_id(song2.id)

        if user_response == sgy.UserResponse.WIN:
            self.winner = song1
            self.strategy.register_rating(song1, song2)
        elif user_response == sgy.UserResponse.LOSE:
            self.winner = song2
            self.strategy.register_rating(song2, song1)
        elif user_response is None:
            self.strategy.register_rating(song1, song2, draw=True)
