from typing import Any

from transformers import MarianMTModel, MarianTokenizer

from app.translation.detector import Detector
from app.translation.exceptions import NoTranslationPathError
from app.translation.languages import Language
from app.translation.singleton import singleton
from app.utils import logger


@singleton
class Translator:
    def __init__(
        self,
        supported_langs: list[Language],
        supported_pairs: dict[tuple[Language, Language], str],
    ) -> None:
        logger.info("Initializing translator")

        self.supported_langs = supported_langs
        self.supported_pairs = supported_pairs

        self._detector = Detector(supported_langs)

        self.models: dict[tuple[Language, Language], Any] = {}
        self.tokenizers: dict[tuple[Language, Language], Any] = {}

        for src_lang, tgt_lang in self.supported_pairs.keys():
            self._load_model(src_lang, tgt_lang)

        logger.info("All models loaded")

    def is_supported(self, src_lang: Language, tgt_lang: Language) -> bool:
        if src_lang == Language.AUTO and tgt_lang in self.supported_langs:
            return True

        if (src_lang, tgt_lang) in self.supported_pairs:
            return True

        try:
            self._get_translation_chain(src_lang, tgt_lang)
            return True
        except ValueError:
            pass
        return False

    def _load_model(self, src_lang: Language, tgt_lang: Language) -> None:
        # models are downloaded to ~/.cache/huggingface

        logger.info(f"Loading model {src_lang.name}->{tgt_lang.name}")

        pair = (src_lang, tgt_lang)

        if pair not in self.supported_pairs:
            raise ValueError(
                f"Unsupported language pair: {src_lang.value}->{tgt_lang.value}"
            )

        if pair not in self.models:
            model_name = self.supported_pairs[pair]
            self.tokenizers[pair] = MarianTokenizer.from_pretrained(model_name)
            self.models[pair] = MarianMTModel.from_pretrained(model_name)

    def _translate_direct(
        self, src_lang: Language, tgt_lang: Language, text: str, **generation_kwargs
    ) -> str:
        pair = (src_lang, tgt_lang)

        if pair not in self.supported_pairs:
            raise ValueError(f"Pair {src_lang}-> {tgt_lang} not supported")

        tokenizer = self.tokenizers[pair]
        model = self.models[pair]

        batch = tokenizer([text], return_tensors="pt", truncation=True)

        translated = model.generate(**batch, **generation_kwargs)

        return tokenizer.batch_decode(translated, skip_special_tokens=True)[0]

    def _get_translation_chain(
        self, src_lang: Language, tgt_lang: Language
    ) -> list[Language]:
        # Direct translation
        if (src_lang, tgt_lang) in self.supported_pairs:
            return [src_lang, tgt_lang]

        # Try to find a path through English as intermediate language
        if (src_lang, Language.EN) in self.supported_pairs and (
            Language.EN,
            tgt_lang,
        ) in self.supported_pairs:
            return [src_lang, Language.EN, tgt_lang]

        raise NoTranslationPathError(
            f"No translation path found from {src_lang.value} to {tgt_lang.value}"
        )

    def _translate_chain(
        self, chain: list[Language], text: str, **generation_kwargs
    ) -> str:
        for src_lang, tgt_lang in zip(chain[:-1], chain[1:]):
            text = self._translate_direct(src_lang, tgt_lang, text, **generation_kwargs)
        return text

    def translate_raw(
        self, src_lang: Language, tgt_lang: Language, text: str, **generation_kwargs
    ) -> str:
        if src_lang == tgt_lang:
            return ""

        chain = self._get_translation_chain(src_lang, tgt_lang)
        text = self._translate_chain(chain, text, **generation_kwargs)
        return text

    def translate_raw_batch(
        self,
        src_lang: Language,
        tgt_lang: Language,
        texts: list[str],
        **generation_kwargs,
    ) -> list[str]:
        return [
            self.translate_raw(src_lang, tgt_lang, text, **generation_kwargs)
            for text in texts
        ]

    def translate(
        self, src_lang: Language, tgt_lang: Language, text: str, **generation_kwargs
    ) -> tuple[str, str]:
        if tgt_lang == Language.AUTO:
            raise ValueError("`auto` language cannot be specified as target language")

        detected_src_lang = self._detector.detect(text)

        if detected_src_lang == tgt_lang:
            return text, ""

        if src_lang == Language.AUTO:
            if detected_src_lang is None:
                return "", "Unable to recognize source language"
            src_lang = detected_src_lang

        elif detected_src_lang is not None and detected_src_lang != src_lang:
            error_msg = f"Source language {src_lang} does not match detected {detected_src_lang}"
            return "", error_msg

        try:
            text = self.translate_raw(src_lang, tgt_lang, text, **generation_kwargs)
            message = "Language not recognized" if detected_src_lang is None else ""
            return text, message
        except NoTranslationPathError as e:
            return "", str(e)

    def translate_batch(
        self,
        src_lang: Language,
        tgt_lang: Language,
        texts: list[str],
        **generation_kwargs,
    ) -> list[tuple[str, str]]:
        return [
            self.translate(src_lang, tgt_lang, text, **generation_kwargs)
            for text in texts
        ]
