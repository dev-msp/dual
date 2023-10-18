import sqlite3

from dual.db.track import Track


def result_to_model(result, cls):
    """Convert a sqlite3 result to a model"""
    return [cls(row) for row in result.fetchall()]


class Beets:
    """Interact with the beets library DB (sqlite)"""

    def __init__(self, path=None):
        self.path = path
        self.conn = sqlite3.connect(path)
        self.conn.row_factory = sqlite3.Row
        self.cursor = self.conn.cursor()

    def tracks_within_score_range(self, min_score, max_score, limit=100):
        """Return all tracks within a score range"""
        # Score is determined by the custom beet field 'score'
        query = """
            SELECT * FROM items
            WHERE id IN (
                SELECT entity_id FROM item_attributes
                WHERE key='score' AND value BETWEEN ? AND ?
            )
            LIMIT ?
        """
        result = self.cursor.execute(query, (min_score, max_score, limit))
        return result_to_model(result, Track)

    def unscored_tracks(self, limit=100):
        """Return all tracks without a score"""
        query = """
            SELECT * FROM items
            WHERE id NOT IN (
                SELECT entity_id FROM item_attributes
                WHERE key='score'
            )
            LIMIT ?
        """
        result = self.cursor.execute(query, (limit,))
        return result_to_model(result, Track)
