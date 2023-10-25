import os
from random import sample
from enum import Enum

from dual.bloom import BloomFilter
from dual.db import Beets, Track
from dual.audio import MpvClient
from dual.audio.player import Player
from dual.elo import new_score


class UserResponse(Enum):
    """The user response to a question"""
    win = 'win'
    lose = 'lose'
    draw = 'draw'


class RoundFilter(BloomFilter):
    """A bloom filter that keeps track of the rounds"""

    def __init__(self):
        super().__init__(int(77e3), 13)

    def _as_string(self, ta: Track, tb: Track):
        aid, bid = sorted([ta.id(), tb.id()])
        return f'{aid}-{bid}'

    def add(self, ta: Track, tb: Track):
        super().add(self._as_string(ta, tb))

    def possibly_contains(self, ta: Track, tb: Track):
        return super().possibly_contains(self._as_string(ta, tb))


class App:
    """The Dual app"""

    def __init__(self):
        self.db = Beets(os.getenv('XDG_CONFIG_HOME') + '/beets/library.db')
        self.mpv = MpvClient()
        self.player = Player(self.db, self.mpv)
        self.rounds = RoundFilter()
        self.max_consecutive_wins = 5
        self._wins = 0
        self._winner = None

    @property
    def wins(self) -> int:
        """Get the current winning streak"""
        return self._wins

    @property
    def winner(self) -> Track | None:
        """Get the winner of the last question"""
        return self._winner

    @winner.setter
    def winner(self, track: Track):
        """Set the winner of the last question"""
        # reset the winner and streak if the value is None or streak is maxed
        if track is None:
            self._wins = 0
            self._winner = None

        track.reload(self.db)
        if self._winner is not None and track.id() == self._winner.id():
            if self._wins >= self.max_consecutive_wins:
                self._wins = 0
                self._winner = None
                return
            # increment the streak if the winner is the same
            self._wins += 1
        else:
            # reset the streak if the winner is different
            self._wins = 1
            track.reload(self.db)
            self._winner = track

    @winner.deleter
    def winner(self):
        """Delete the winner of the last question"""
        self._wins = 0
        self._winner = None

    def get_elimination_pair(self, tries_left=3) -> tuple[Track, Track]:
        if tries_left == 0:
            if self.winner is None:
                raise ValueError('Could not find a valid pair of songs')
            del self.winner

        pair = [self.winner] if self.winner else []
        p = self._supplement_pair(
            pair,
            not_rated_in_last=3600,
            order_by='score DESC'
        )

        if self.rounds.possibly_contains(*p):
            return self.get_elimination_pair(tries_left - 1)

        if p[0].id() == p[1].id():
            del self.winner
            return self.get_elimination_pair(tries_left - 1)

        return p

    def get_next_pair(self) -> tuple[Track, Track]:
        """Get the next pair of songs to rate

        Returns:
            tuple: (song1, song2)
        """
        tracks = self.db.tracks_within_score_range(
            1000,
            999999,
            limit=100,
            order_by='RANDOM()',
            not_rated_in_last=900
        )
        return self._supplement_pair(sample(tracks, min(len(tracks), 2)))

    def update_ratings(
        self,
        song1: Track,
        song2: Track,
        user_response: UserResponse
    ):
        """Update the ratings

        Args:
            song1 (Track): song1
            song2 (Track): song2
            user_response (str): the outcome for song 1
        """

        self.rounds.add(song1, song2)
        score_from_response = {
            UserResponse.win: 1,
            UserResponse.lose: 0,
            UserResponse.draw: 0.5
        }[user_response]

        song1_score, song2_score = new_score(
            song1.score(),
            song2.score(),
            score_from_response
        )

        self.db.update_score(song1, song1_score)
        self.db.update_score(song2, song2_score)

        if user_response == UserResponse.win:
            self.winner = song1
        elif user_response == UserResponse.lose:
            self.winner = song2

    def _supplement_pair(
        self,
        pair: list[Track],
        **kwargs
    ) -> tuple[Track, Track]:
        """Supplement a pair of tracks with additional information"""
        if len(pair) > 2:
            raise ValueError('Pair must have at most 2 elements')
        for n in range(2 - len(pair)):
            random_track = sample(self.db.tracks(
                **kwargs,
                limit=200
            ), 1)[0]
            pair.append(random_track)
        return tuple(pair)
