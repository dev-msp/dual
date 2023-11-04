import os

from peewee import (
    SqliteDatabase,
)

db = SqliteDatabase(os.getenv('XDG_CONFIG_HOME') + '/beets/library.db')
