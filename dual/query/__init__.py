import datetime
import re
from itertools import repeat
import math
from enum import auto
from enum import Enum


def has_comparable_methods(val):
    methods = ['__lt__', '__le__', '__eq__', '__ne__', '__gt__', '__ge__']
    return all(hasattr(val, m) and callable(getattr(val, m)) for m in methods)


class EnforceMinMax(type):
    def __new__(cls, name, bases, attrs):
        if not isinstance(bases[0], cls):
            return super().__new__(cls, name, bases, attrs)
        # exempt the base class
        if 'min' in attrs and 'max' in attrs:
            if attrs['min'] is None or attrs['max'] is None:
                raise ValueError(f"min or max is None: {attrs['min']} {attrs['max']}")
            if not isinstance(attrs['min'], type(attrs['max'])):
                raise ValueError(f"min and max are not the same type: {attrs['min']} {attrs['max']}")
            if not has_comparable_methods(attrs['min']) and not has_comparable_methods(attrs['max']):
                raise ValueError(f"min and max are not comparable: {attrs['min']} {attrs['max']}")
            if attrs['min'] > attrs['max']:
                raise ValueError(f"min > max: {attrs['min']} > {attrs['max']}")
            return super().__new__(cls, name, bases, attrs)
        else:
            raise ValueError(f"min or max not found in {name}")


def split_once(s, sep):
    i = s.find(sep)
    if i == -1:
        return s, None
    return s[:i], s[i + len(sep):]


# entity enum
class Entity(Enum):
    ORDERING = auto()
    FIELD = auto()
    SPLAT = auto()


def parse_entity(entity, field_type_mapping={}):
    entity = entity.strip()
    match [x.strip() for x in split_once(entity, ':')]:
        case [field, str(value)]:
            field_cls = field_type_mapping.get(field, SimpleString)
            return Entity.FIELD, field, field_cls(value)
        case [value, None] if re.test(r'[+-]$', entity):
            return Entity.ORDERING, entity[:-1], 1 if entity[-1] == '+' else -1
        case [value, None]:
            return Entity.SPLAT, SimpleString(value)


class Query:
    def __init__(self, field_type_mapping={}):
        self.ordering = None
        self.clauses = {}
        self.splat = None
        self.field_type_mapping = field_type_mapping

    def __repr__(self):
        clause_reprs = ',\n'.join([f"  {field} -> {clause}" for field, clause in self.clauses.items()])
        return f"Query(\n  ordering={self.ordering},\n{clause_reprs}\n)"

    def parse(self, expression):
        expression = expression.strip()
        clauses = {}
        for clause in expression.split(' '):
            match parse_entity(clause, self.field_type_mapping):
                case (Entity.ORDERING, field, direction):
                    if self.ordering is not None:
                        raise ValueError(f"Multiple orderings found: {clause}")
                    self.ordering = (field, direction)
                case (Entity.FIELD, field, value):
                    if field in clauses:
                        raise ValueError(f"Multiple clauses for field {field} found: {clause}")
                    clauses[field] = value
                case (Entity.SPLAT, value):
                    if self.splat is not None:
                        raise ValueError(f"Multiple splats found: {clause}")
                    self.splat = value

        self.clauses = clauses


class QueryClause:
    def __init__(self, expression):
        self.expression = expression
        self.parse()

    def __repr__(self):
        raise NotImplementedError()

    def parse(self):
        raise NotImplementedError()


class SimpleString(QueryClause):
    def __repr__(self):
        return f"string({self.expression})"

    def parse(self):
        pass


class RangeQuery(QueryClause, metaclass=EnforceMinMax):
    def __init__(self, expression):
        self.min = None
        self.max = None
        super().__init__(expression)

    def __repr__(self):
        return f"range(from={self.min}, to={self.max})"

    def parse_value(self, value):
        raise NotImplementedError()

    def min_range(self):
        return 0

    def parse(self):
        expression = self.expression
        if '..' not in expression:
            try:
                self.min = self.max = self.parse_value(expression)
            except ValueError:
                raise ValueError(f"Invalid range query: {expression}")
        else:
            exp_min, exp_max = expression.split('..')
            self.min = self.parse_value(exp_min) if exp_min else self.__class__.min
            self.max = self.parse_value(exp_max) if exp_max else self.__class__.max

        self.min = max(self.min, self.__class__.min)
        self.max = min(self.max, self.__class__.max)

        if self.min > self.max:
            self.min, self.max = self.max, self.min

        if self.max - self.min < self.min_range():
            self.max = self.min + self.min_range()


class FloatRangeQuery(RangeQuery):
    min = -math.inf
    max = math.inf

    def parse_value(self, value):
        return float(value)


class IntRangeQuery(RangeQuery):
    min = -math.inf
    max = math.inf

    def parse_value(self, value):
        return int(value)


class DateRangeQuery(RangeQuery):
    min = datetime.datetime.min
    max = datetime.datetime.max

    """
    Supported formats:
    - YYYY[[-MM]-DD]
    - regex: -?[1-9][0-9]*[ymwd]
    """

    def min_range(self):
        return datetime.timedelta(days=1)

    def parse_value(self, value):
        value = value.strip()
        m = re.match(r'^(-?[1-9][0-9]*)([ymwdh])$', value)
        if m:
            value, unit = m.groups()
            value = int(value)
            multipliers = {'y': 365, 'm': 30, 'w': 7, 'd': 1, 'h': 1 / 24}
            if unit not in multipliers:
                raise ValueError(f"Invalid date range query: {value}")
            delta = datetime.timedelta(hours=value * multipliers[unit] * 24)
            return datetime.datetime.now() + delta

        m = re.match(r'^([0-9]{4})(?:-([0-9]{2}))?(?:-([0-9]{2}))?$', value)
        if not m:
            raise ValueError(f"Invalid date range query: {value}")
        year, month, day = (int(x or y) for x, y in zip(m.groups(), repeat(1, 3)))
        return datetime.datetime(year, month, day)
