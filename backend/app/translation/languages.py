from enum import Enum


class Language(Enum):
    EN = "en"
    PL = "pl"
    DE = "de"


class LanguagePair(Enum):
    PL_EN = (Language.PL, Language.EN)
    EN_DE = (Language.EN, Language.DE)
