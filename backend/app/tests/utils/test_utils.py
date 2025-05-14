import pytest
from pydantic import ValidationError

from app.utils import _normalise, validate_shortcut


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("ctrl", "Ctrl"),
        ("  CTRL  ", "Ctrl"),
        ("\talt\n", "Alt"),
        ("sHiFt", "Shift"),
        ("  space  ", "Space"),
    ],
)
def test_normalise_basic(raw: str, expected: str) -> None:
    assert _normalise(raw) == expected


VALID_CASES = [
    ("Ctrl + P", "Ctrl + P"),
    ("ctrl+p", "Ctrl + P"),
    ("Alt + Shift+X", "Alt + Shift + X"),
    ("Meta+Enter", "Meta + Enter"),
    ("super+tab", "Super + Tab"),
    ("  ctrl +   alt  + h  ", "Ctrl + Alt + H"),
    (None, None),
    ("", ""),
]


@pytest.mark.parametrize("raw, expected", VALID_CASES)
def test_validate_shortcut_valid(raw, expected) -> None:
    assert validate_shortcut(raw) == expected


INVALID_CASES = [
    "Ctrll + P",
    "P + Ctrl",
    "Ctrl + Ctrl + P",
    "Ctrl + Unknown",
    "Alt++F4",
]


@pytest.mark.parametrize("raw", INVALID_CASES)
def test_validate_shortcut_invalid(raw) -> None:
    with pytest.raises((ValidationError, ValueError)):
        validate_shortcut(raw)
