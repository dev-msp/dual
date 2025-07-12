from pprint import pprint

from peewee import *

from dual.db.item import *

cxitem = Item.with_custom_attributes().where(SQL('variant').is_null())
is_rated = SQL('last_rated_at').is_null(False)

rated_count = fn.SUM(Case(is_rated, ((1, 1),), 0)).cast('float')
total_count = fn.COUNT(1 == 1).cast('float')

albums = cxitem.select(
    Item.albumartist,
    Item.album,
    total_count.alias('total_count'),
    ((rated_count / total_count) * 100).alias('percent_rated')
).group_by(Item.albumartist, Item.album).order_by(SQL('percent_rated').desc())


def format_album(album, **kwargs):
    base = f'{album.albumartist} - {album.album}'
    if kwargs:
        base += f' ({kwargs})'
    return base


print('\n'.join([format_album(a, total_count=a.total_count, percent_rated=a.percent_rated) for a in albums.namedtuples() if a.percent_rated < 100 and a.total_count > 1]))
