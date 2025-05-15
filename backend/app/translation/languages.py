from enum import Enum

from lingua import Language as LinguaLang


class Language(Enum):
    EN = "en"  # English
    PL = "pl"  # Polish
    DE = "de"  # German
    ES = "es"  # Spanish
    FR = "fr"  # French

    @classmethod
    def from_lingua(cls, language: LinguaLang) -> "Language":
        return _FROM_LINGUA[language]

    def to_lingua(self) -> LinguaLang:
        return _TO_LINGUA[self]

    def __str__(self) -> str:
        return self.name


_TO_LINGUA = {
    Language.EN: LinguaLang.ENGLISH,
    Language.PL: LinguaLang.POLISH,
    Language.DE: LinguaLang.GERMAN,
    Language.ES: LinguaLang.SPANISH,
    Language.FR: LinguaLang.FRENCH,
}

_FROM_LINGUA = {
    LinguaLang.ENGLISH: Language.EN,
    LinguaLang.POLISH: Language.PL,
    LinguaLang.GERMAN: Language.DE,
    LinguaLang.SPANISH: Language.ES,
    LinguaLang.FRENCH: Language.FR,
}


class LanguagePair(Enum):
    PL_EN = (Language.PL, Language.EN)
    EN_DE = (Language.EN, Language.DE)
    EN_ES = (Language.EN, Language.ES)
    ES_EN = (Language.ES, Language.EN)
    EN_FR = (Language.EN, Language.FR)
    FR_EN = (Language.FR, Language.EN)
