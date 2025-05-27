import pytest

from app.translation.languages import Language
from app.translation.translator import Translator


@pytest.mark.slow
def test_translation_pl_en(translator: Translator):
    assert (Language.PL, Language.EN) in translator.supported_pairs
    output = translator.translate_raw(Language.PL, Language.EN, "Cześć!")
    assert output == "Hi!"


@pytest.mark.slow
def test_translation_en_de(translator: Translator):
    assert (Language.EN, Language.DE) in translator.supported_pairs
    output = translator.translate_raw(Language.EN, Language.DE, "Hello!")
    assert output == "Guten Tag!"


@pytest.mark.slow
def test_translation_en_es(translator: Translator):
    assert (Language.EN, Language.ES) in translator.supported_pairs
    output = translator.translate_raw(Language.EN, Language.ES, "Hello!")
    assert output == "¡Hola!"


@pytest.mark.slow
def test_translation_es_en(translator: Translator):
    assert (Language.ES, Language.EN) in translator.supported_pairs
    output = translator.translate_raw(Language.ES, Language.EN, "¡Hola!")
    assert output == "Hello!"


@pytest.mark.slow
def test_translation_en_fr(translator: Translator):
    assert (Language.EN, Language.FR) in translator.supported_pairs
    output = translator.translate_raw(Language.EN, Language.FR, "Hello!")
    assert output == "Bonjour !"


@pytest.mark.slow
def test_translation_fr_en(translator: Translator):
    assert (Language.FR, Language.EN) in translator.supported_pairs
    output = translator.translate_raw(Language.FR, Language.EN, "Bonjour!")
    assert output == "Hello!"


@pytest.mark.slow
def test_translation_batch(translator: Translator):
    assert (Language.PL, Language.EN) in translator.supported_pairs
    output = translator.translate_raw_batch(
        Language.PL, Language.EN, ["Jabłko", "Gruszka", "Malina"]
    )
    assert output == ["Apple", "Pear", "Raspberry"]


@pytest.mark.slow
def test_translation_chain_explicit(translator: Translator):
    assert (Language.PL, Language.EN) in translator.supported_pairs
    assert (Language.EN, Language.DE) in translator.supported_pairs
    output = translator._translate_chain(
        [Language.PL, Language.EN, Language.DE], "Cześć!"
    )
    assert output == "Guten Tag!"


@pytest.mark.slow
def test_translation_chain_implicit(translator: Translator):
    assert (Language.PL, Language.DE) not in translator.supported_pairs
    assert (Language.PL, Language.EN) in translator.supported_pairs
    assert (Language.EN, Language.DE) in translator.supported_pairs
    output = translator.translate_raw(Language.PL, Language.DE, "Cześć!")
    assert output == "Guten Tag!"


@pytest.mark.slow
def test_is_supported_direct(translator: Translator):
    assert (Language.PL, Language.EN) in translator.supported_pairs
    assert translator.is_supported(Language.PL, Language.EN)


@pytest.mark.slow
def test_is_supported_chain(translator: Translator):
    assert (Language.PL, Language.DE) not in translator.supported_pairs
    assert (Language.PL, Language.EN) in translator.supported_pairs
    assert (Language.EN, Language.DE) in translator.supported_pairs
    assert translator.is_supported(Language.PL, Language.DE)


@pytest.mark.slow
def test_is_supported_auto(translator: Translator):
    assert translator.is_supported(Language.AUTO, Language.EN)


@pytest.mark.slow
def test_is_supported_unsupported(translator: Translator):
    assert (Language.DE, Language.EN) not in translator.supported_pairs
    assert not translator.is_supported(Language.DE, Language.EN)
