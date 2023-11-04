from dual.audio import LoadfileOption, MpvClient
from dual.db.item import Item


class Player:
    def __init__(
        self,
        mpv: MpvClient
    ):
        self.mpv = mpv

    def enqueue_tracks(
        self,
        tracks: list[Item],
        mode: LoadfileOption
    ):
        if len(tracks) == 0:
            return
        self.mpv.enqueue([t.path for t in tracks], mode=mode)

    def enqueue_track_by_id(self, track_id):
        track = Item.get_by_id(track_id)
        self.mpv.enqueue([track.path])

    def get_current_track(self):
        result = self.mpv.current_track()
        if 'error' in result:
            return None
        return Item.get(Item.path == result['data'])
