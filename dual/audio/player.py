from dual.db import Beets, Track
from dual.audio import MpvClient


class Player:
    def __init__(
        self,
        db: Beets,
        mpv: MpvClient
    ):
        self.db = db
        self.mpv = mpv

    def enqueue_tracks(
        self,
        tracks: list[Track],
        replace=False
    ):
        self.mpv.enqueue([t.path() for t in tracks], replace=replace)

    def enqueue_track_by_id(self, track_id):
        track = self.db.get_track_by_id(track_id)
        self.mpv.enqueue([track.path()])

    def get_current_track(self):
        p = self.mpv.current_track()['data']
        return self.db.get_track_by_path(p)
