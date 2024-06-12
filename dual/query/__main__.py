from dual.query import RangeQuery

queries = [
    '2..5',
    '3..',
    '..5',
    '5..3',
    '3..3',
]

for q in queries:
    print(RangeQuery(q))
