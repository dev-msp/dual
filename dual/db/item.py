import time
from typing import Tuple

from peewee import JOIN, CharField, ForeignKeyField, IntegerField, Model

from dual.db.core import db


class BaseModel(Model):
    class Meta:
        database = db


class Item(BaseModel):
    id = IntegerField(primary_key=True)
    path = CharField()
    title = CharField()
    artist = CharField()
    genre = CharField()
    length = IntegerField()

    track = IntegerField()
    tracktotal = IntegerField()
    disc = IntegerField()
    disctitle = CharField()
    disctotal = IntegerField()
    album = CharField()
    albumartist = CharField()
    albumartist_sort = CharField()
    albumartist_credit = CharField()
    albumtype = CharField()
    albumstatus = CharField()
    albumdisambig = CharField()
    rg_album_gain = IntegerField()
    rg_album_peak = IntegerField()

    year = IntegerField()
    month = IntegerField()
    day = IntegerField()
    original_year = IntegerField()
    original_month = IntegerField()
    original_day = IntegerField()

    bitrate = IntegerField()
    format = CharField()
    samplerate = IntegerField()
    bitdepth = IntegerField()
    channels = IntegerField()
    mtime = IntegerField()
    added = IntegerField()
    path = CharField()
    label = CharField()
    asin = CharField()
    catalognum = CharField()
    script = CharField()
    language = CharField()
    country = CharField()
    media = CharField()
    encoder = CharField()

    class Meta:
        table_name = 'items'

    @classmethod
    def with_custom_attributes(cls):
        ctes = ItemAttribute.ctes()
        cte_selects = [cte.c[key] for key, cte in ctes.items()]
        q = cls.select(cls, *cte_selects)
        for cte in ctes.values():
            q = q.join(cte, JOIN.LEFT_OUTER, on=(cls.id == cte.c.entity_id))
        return q.with_cte(*ctes.values())

    @classmethod
    def namedtuple_from_id(cls, id: int):
        return cls.with_custom_attributes().where(cls.id == id).namedtuples().get()

    def score(self) -> float:
        """Return the score of the item."""
        Item.namedtuple_from_id(self.id).score

    def last_rated_at(self) -> float:
        """Return the timestamp of the last time the item was rated."""
        Item.namedtuple_from_id(self.id).last_rated_at

    def rating_count(self) -> int:
        """Return the number of times the item has been rated."""
        c = Item.namedtuple_from_id(self.id).rating_count
        return int(c) if c is not None else 0

    def update_score(self, score: float):
        """Update the score of the item."""
        self._update_custom_attribute('SCORE', str(score))
        self._update_custom_attribute('LAST_RATED_AT', str(int(time.time())))
        self._update_custom_attribute('RATING_COUNT', str(self.rating_count() + 1))

    def _update_custom_attribute(self, label: str, value: str):
        """Update the value of a custom attribute."""
        if label not in get_attributes():
            raise ValueError(f'"{label}" is not a valid attribute')

        key = get_attributes()[label][0]

        ItemAttribute \
            .insert(entity_id=self.id, key=key, value=value) \
            .on_conflict_replace() \
            .execute()


def get_attributes() -> dict[str, Tuple[str, str]]:
    def is_attr_tuple(value) -> bool:
        return isinstance(value, tuple) \
            and len(value) == 2 \
            and all(isinstance(v, str) for v in value)

    return {
        key: value
        for key, value in vars(ItemAttribute).items()
        if key.isupper() and is_attr_tuple(value)
    }


class ItemAttribute(BaseModel):
    SCORE = ('score', 'real')
    LAST_RATED_AT = ('last_rated_at', 'integer')
    RATING_COUNT = ('rating_count', 'integer')
    VARIANT = ('variant', 'text')

    entity_id = ForeignKeyField(Item, backref='attributes')
    key = CharField()
    value = CharField()

    class Meta:
        table_name = 'item_attributes'

    @classmethod
    def cte(cls, key: str, type: str):
        return cls.select(cls.entity_id, cls.value.cast(type).alias(key)) \
            .where(cls.key == key).cte(f'cte_{key}')

    @classmethod
    def ctes(cls):
        return {key: cls.cte(key, type) for key, type in get_attributes().values()}
