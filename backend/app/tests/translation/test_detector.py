import pytest

from app.translation.detector import Detector
from app.translation.languages import Language


@pytest.mark.slow
def test_detection_en(detector: Detector):
    assert Language.EN in detector.languages
    lang = detector.detect("awesome")
    assert lang == Language.EN


@pytest.mark.slow
def test_detection_pl(detector: Detector):
    assert Language.PL in detector.languages
    lang = detector.detect("świetny")
    assert lang == Language.PL


@pytest.mark.slow
def test_detection_de(detector: Detector):
    assert Language.DE in detector.languages
    lang = detector.detect("fantastisch")
    assert lang == Language.DE


@pytest.mark.slow
def test_detection_es(detector: Detector):
    assert Language.ES in detector.languages
    lang = detector.detect("impresionante")
    assert lang == Language.ES


@pytest.mark.slow
def test_detection_fr(detector: Detector):
    assert Language.FR in detector.languages
    lang = detector.detect("génial")
    assert lang == Language.FR
