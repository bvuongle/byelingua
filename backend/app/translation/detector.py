from lingua import LanguageDetectorBuilder

from app.translation.languages import Language
from app.translation.singleton import singleton


@singleton
class Detector:
    def __init__(self, languages: list[Language]) -> None:
        self.languages = languages

        langs = (lang.to_lingua() for lang in languages)
        self._detector = (
            LanguageDetectorBuilder.from_languages(*langs)
            .with_preloaded_language_models()
            .build()
        )

    def detect(self, text: str) -> Language | None:
        lang = self._detector.detect_language_of(text)
        return Language.from_lingua(lang) if lang else None
