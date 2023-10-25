from dual.db import Beets, Track
from dual.audio import MpvClient, LoadfileOption


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
        mode: LoadfileOption
    ):
        if len(tracks) == 0:
            return
        self.mpv.enqueue([t.path() for t in tracks], mode=mode)

    def enqueue_track_by_id(self, track_id):
        track = self.db.get_track_by_id(track_id)
        self.mpv.enqueue([track.path()])

    def get_current_track(self):
        result = self.mpv.current_track()
        if 'error' in result:
            return None
        return self.db.get_track_by_path(result['data'])
