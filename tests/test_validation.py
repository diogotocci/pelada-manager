import pytest
from werkzeug.exceptions import BadRequest

import app


def test_is_valid_attribute():
    assert app._is_valid_attribute(1)
    assert app._is_valid_attribute(2)
    assert app._is_valid_attribute(3)
    assert not app._is_valid_attribute(0)
    assert not app._is_valid_attribute(4)


def test_parse_weekday_valid():
    assert app._parse_weekday(0) == 0
    assert app._parse_weekday(6) == 6
    assert app._parse_weekday("3") == 3
    assert app._parse_weekday(None) is None


@pytest.mark.parametrize("bad", [-1, 7, "abc"])
def test_parse_weekday_invalid(bad):
    with pytest.raises(BadRequest):
        app._parse_weekday(bad)
