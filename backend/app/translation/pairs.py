from app.translation.languages import Language


SUPPORTED_PAIRS = {
    (Language.PL, Language.EN): "Helsinki-NLP/opus-mt-pl-en",
    (Language.EN, Language.DE): "Helsinki-NLP/opus-mt-en-de",
    # TODO more pairs in future
}
