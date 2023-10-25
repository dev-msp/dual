from sqlite3 import Row
from datetime import datetime


def build_kv_string(row: Row):
    return ", ".join([f"{k}={v}" for k, v in dict(row).items()])


class Track:
    def __init__(self, row: Row):
        self.row = row

    def __str__(self):
        return f"{self.row['title']} by {self.row['artist']}"

    def __repr__(self):
        return f"Track({build_kv_string(self.row)})"

    def _has_key(self, key):
        return key in self.row.keys()

    def _get_key(self, key):
        if not self._has_key(key):
            raise KeyError(f"Key {key} not found in {self.row.keys()}")
        return self.row[key]

    def reload(self, db):
        self.row = db.get_track_by_id(self.id()).row

    def id(self):
        return self.row['id']

    def path(self):
        # this is a binary blob, so we need to convert it to a string
        return self.row['path'].decode('utf-8')

    def title(self):
        return self.row['title']

    def artist(self):
        return self.row['artist']

    def album(self):
        return self.row['album']

    def last_rated_at(self):
        lra = self._get_key('last_rated_at')
        if lra is None:
            return None
        return datetime.fromtimestamp(int(lra))

    def score(self):
        # convert to float because sqlite3 returns a string
        score = self._get_key('score')
        if score is None:
            return 1500
        return float(score)
