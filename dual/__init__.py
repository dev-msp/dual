import os
from dual.db import Beets


def main():
    db = Beets(os.getenv('XDG_CONFIG_HOME') + '/beets/library.db')

    tracks = db.unscored_tracks()
    for row in tracks:
        print(row)
