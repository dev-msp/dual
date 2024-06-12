import logging

from peewee import SQL

from dual.db.item import Item
from dual import elo
from . import KeepWinner, RoundFilter, UserResponse


class Bisect(KeepWinner):
    """Bisect the search space."""

    _source_query = Item.with_custom_attributes() \
        .namedtuples()

    _ranking_query = _source_query \
        .where(SQL('score').is_null(False)) \
        .order_by(SQL('score').desc())

    def __init__(self, app):
        super().__init__('Bisect', app)
        self.rounds = RoundFilter()
        self.reset_track()

    def _disqualified(self):
        # return a set of ids whose loss count exceeds their win count by 2 or more
        return {k for k, v in self.loss_counts.items() if v >= self.win_counts.get(k, 0) + 2}

    @property
    def midpoint(self):
        return (self.span[0] + self.span[1]) // 2

    def source_query(self):
        return self.app.refine_query(Bisect._source_query) \
            .where(Item.id.not_in(self._disqualified()))

    def ranking_query(self):
        return self.app.refine_query(Bisect._ranking_query) \
            .where(Item.id.not_in(self._disqualified()))

    def reset_track(self):
        logging.debug("Resetting track")
        logging.info("Ranking query count: %s", self.ranking_query().count())
        logging.info("Track loss counts: %s", self.loss_counts)
        self.span = (0, self.ranking_query().count())
        q = self.source_query()
        if not self.app.top:
            self.track = q.order_by(SQL('rating_count').asc()).first()
        else:
            self.track = q.offset(self.midpoint).first()
        logging.info("Reset track to %s (id: %s)", self.track.title, self.track.id)

    def get_at_index(self, index):
        return self.ranking_query().where(Item.id != self.track.id).offset(index).first()

    def new_score(self, song1, song2, response):
        # response determines the winner
        # the winner either keeps its score if the other song is already lower,
        # or gets a new score of the other song plus 0.01
        song1_old = song1.score
        song2_old = song2.score

        song1_parent, song2_parent = elo.new_score(song1.score, song2.score, float(response), k=1)

        if response == UserResponse.WIN:
            return max(song1_old, song2_old + 0.01), song2_parent
        elif response == UserResponse.LOSE:
            return song1_parent, max(song1_old, song2_old + 0.01)

        return song1_old, song2_old

    def register_rating(self, winner, loser, draw=False):

        logging.info("span was %s", self.span)
        if not draw:
            if winner.id == self.track.id:
                # advance the span
                self.span = (self.span[0], (self.span[0] + self.span[1]) // 2)
                logging.info(f"Advancing span to {self.span}")
            else:
                # retreat the span
                self.span = ((self.span[0] + self.span[1]) // 2, self.span[1])
                logging.info(f"Retreating span to {self.span}")

        super().register_rating(winner, loser, draw=draw)

    def next_pair(self, **kwargs):
        # only two songs left
        if self.span[0] == self.span[1] - 2:
            self.track, track = self.get_at_index(self.span[0]), self.get_at_index(self.span[1])
            if self.rounds.possibly_contains((self.track, track)):
                return None, None
        elif self.span[1] - self.span[0] <= 1:
            self.reset_track()
            return self.next_pair(**kwargs)
        else:
            if self.loss_counts.get(self.track.id, 0) >= 2:
                self.reset_track()
            else:
                self.track = Item.with_custom_attributes().where(Item.id == self.track.id).namedtuples().get()
            track = self.get_at_index(self.midpoint)
            idx = self.midpoint
            while self.rounds.possibly_contains((self.track, track)):
                logging.info("Skipping pairing %s vs %s", self.track.title, track.title)
                idx -= 1
                track = self.get_at_index(idx)

        return self.track, track
