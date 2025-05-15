from app.translation.languages import Language


SUPPORTED_LANGS = [
    Language.EN,
    Language.PL,
    Language.DE,
    Language.ES,
    Language.FR,
]

SUPPORTED_PAIRS = {
    (Language.PL, Language.EN): "Helsinki-NLP/opus-mt-pl-en",
    (Language.EN, Language.DE): "Helsinki-NLP/opus-mt-en-de",
    (Language.EN, Language.ES): "Helsinki-NLP/opus-mt-en-es",
    (Language.ES, Language.EN): "Helsinki-NLP/opus-mt-es-en",
    (Language.EN, Language.FR): "Helsinki-NLP/opus-mt-en-fr",
    (Language.FR, Language.EN): "Helsinki-NLP/opus-mt-fr-en",
}
