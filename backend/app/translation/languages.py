from enum import Enum


class Language(Enum):
    EN = "en"  # English
    PL = "pl"  # Polish
    DE = "de"  # German
    ES = "es"  # Spanish
    FR = "fr"  # French


class LanguagePair(Enum):
    PL_EN = (Language.PL, Language.EN)
    EN_DE = (Language.EN, Language.DE)
    EN_ES = (Language.EN, Language.ES)
    ES_EN = (Language.ES, Language.EN)
    EN_FR = (Language.EN, Language.FR)
    FR_EN = (Language.FR, Language.EN)
