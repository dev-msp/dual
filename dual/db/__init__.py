"""Interact with the beets library DB (sqlite)."""

import logging
import os
import sqlite3

from dual.db.track import Track


def log(ret_callback=None):
    """Log the function call and its arguments."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            logging.debug('Calling %s with %s %s', func.__name__, args, kwargs)
            result = func(*args, **kwargs)
            if ret_callback is not None:
                logging.debug('Result of calling %s: %s',
                              func.__name__,
                              ret_callback(result))
            return result
        return wrapper

    return decorator


def result_to_model(result, cls):
    """Convert a sqlite3 result to a model."""
    return [cls(row) for row in result.fetchall()]


def shorten_path(path):
    """Shorten paths prefixed with the user's home directory to ~."""
    home = os.getenv('HOME')
    xdg_config_home = os.getenv('XDG_CONFIG_HOME')

    if path.startswith(xdg_config_home):
        return 'CFG' + path[len(xdg_config_home):]
    elif path.startswith(home):
        return '~' + path[len(home):]

    return path


class Beets:
    """Interact with the beets library DB (sqlite)."""

    def __init__(self, path=None):
        self.path = path
        self.conn = sqlite3.connect(path)
        # self.conn.set_trace_callback(logging.debug)
        self.conn.row_factory = sqlite3.Row
        self.cursor = self.conn.cursor()

    def __repr__(self):
        return f'<Beets path={shorten_path(self.path)}>'

    @log()
    def get_track_by_id(self, track_id):
        """Get a track by its id."""
        query = """
            SELECT
                items.*,
                CAST(COALESCE(scores.value, '0') AS REAL) AS score,
                CAST(last_rated_at.value AS INTEGER) AS last_rated_at
            FROM items
            LEFT JOIN item_attributes as scores ON (
                items.id = scores.entity_id
                AND scores.key='score'
            )
            LEFT JOIN item_attributes AS last_rated_at ON (
                items.id = last_rated_at.entity_id
                AND last_rated_at.key='last_rated_at'
            )
            WHERE items.id = ?
        """
        result = self.cursor.execute(query, (track_id,))
        return result_to_model(result, Track)[0]

    @log()
    def get_track_by_path(self, path):
        """Get a track by its path."""
        query = """
            SELECT
                items.*,
                CAST(COALESCE(scores.value, '0') AS REAL) AS score,
                CAST(last_rated_at.value AS INTEGER) AS last_rated_at
            from items
            LEFT JOIN item_attributes as scores ON (
                items.id = scores.entity_id
                AND scores.key='score'
            )
            LEFT JOIN item_attributes AS last_rated_at ON (
                items.id = last_rated_at.entity_id
                AND last_rated_at.key='last_rated_at'
            )
            -- cast path to text because it is a blob
            WHERE CAST(items.path AS TEXT) = ?
        """
        result = self.cursor.execute(query, (path,))
        return result_to_model(result, Track)[0]

    @log(ret_callback=lambda r: f"{len(r)} tracks")
    def tracks(
        self,
        limit=100,
        score_range: tuple[int, int] = (0, 999999),
        order_by='RANDOM()',
        not_rated_in_last=0
    ):
        """Return all tracks."""
        query = """
            SELECT
                items.*,
                CAST(COALESCE(scores.value, '0') AS REAL) AS score,
                CAST(last_rated_at.value AS INTEGER) AS last_rated_at
            FROM items
            LEFT JOIN item_attributes as scores ON (
                items.id = scores.entity_id
                AND scores.key='score'
            )
            LEFT JOIN item_attributes AS last_rated_at ON (
                items.id = last_rated_at.entity_id
                AND last_rated_at.key='last_rated_at'
            )

            WHERE score BETWEEN ? AND ?
            AND (
                last_rated_at IS 0
                OR last_rated_at < strftime('%s', 'now', '-{} seconds')
            )
            ORDER BY {}
            LIMIT ?
        """.format(not_rated_in_last, order_by)
        result = self.cursor.execute(query, (*score_range, limit))
        return result_to_model(result, Track)

    def tracks_within_score_range(
        self,
        min_score,
        max_score,
        limit=100,
        order_by='RANDOM()',
        not_rated_in_last=0
    ):
        """Return all tracks within a score range."""
        # Score is determined by the custom beet field 'score'
        query = """
            SELECT items.*, CAST(scores.value AS REAL) AS score,
                CAST(last_rated_at.value AS INTEGER) AS last_rated_at
            FROM items
            INNER JOIN item_attributes as scores ON (
                items.id = scores.entity_id
                AND scores.key='score'
                -- convert to float
                AND CAST(scores.value AS REAL) BETWEEN ? AND ?
            )
            LEFT JOIN item_attributes AS last_rated_at ON (
                items.id = last_rated_at.entity_id
                AND last_rated_at.key='last_rated_at'
                AND (
                    last_rated_at.value IS NULL
                    OR CAST(last_rated_at.value AS INTEGER)
                        < strftime('%s', 'now', '-{} seconds'))
                )
            ORDER BY {}
            LIMIT ?
        """.format(not_rated_in_last, order_by)
        result = self.cursor.execute(query, (min_score, max_score, limit))
        return result_to_model(result, Track)

    def tracks_with_score(self, limit=100):
        return self.tracks_within_score_range(0, 999999, limit)

    def unscored_tracks(self, limit=100):
        """Return all tracks without a score."""
        query = """
            SELECT items.*, item_attributes.value AS score FROM items
            LEFT JOIN item_attributes ON (
                items.id = item_attributes.entity_id
                AND item_attributes.key='score'
            )
            WHERE item_attributes.value IS NULL
            ORDER BY RANDOM()
            LIMIT ?
        """
        result = self.cursor.execute(query, (limit,))
        return result_to_model(result, Track)

    def update_score(self, track, score):
        """Update the score of a track and set its last_rated_at field to now."""
        # last_rated_at is a custom beet field in unix epoch time
        query = """
            INSERT INTO item_attributes (entity_id, key, value)
            VALUES (?, 'score', ?), (?, 'last_rated_at', strftime('%s', 'now'))
            ON CONFLICT (entity_id, key) DO UPDATE SET value=excluded.value
        """
        id = track.id()
        self.cursor.execute(query, (id, score, id))
        self.conn.commit()
