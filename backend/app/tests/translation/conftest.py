import pytest

from app.translation.detector import Detector
from app.translation.supported import SUPPORTED_LANGS, SUPPORTED_PAIRS
from app.translation.translator import Translator


@pytest.fixture
def translator():
    return Translator(SUPPORTED_LANGS, SUPPORTED_PAIRS)


@pytest.fixture
def detector():
    return Detector(SUPPORTED_LANGS)
