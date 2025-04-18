import sys

from transformers import MarianMTModel, MarianTokenizer

from app.models import Language


def singleton(cls):
    instances = {}

    def wrapper(*args, **kwargs):
        if cls not in instances:
            instances[cls] = cls(*args, **kwargs)
        return instances[cls]

    return wrapper


@singleton
class Translator:
    def __init__(self) -> None:
        print("Initializing translator", file=sys.stderr)

        self.supported_pairs = {
            (Language.PL, Language.EN): "Helsinki-NLP/opus-mt-pl-en",
            (Language.EN, Language.DE): "Helsinki-NLP/opus-mt-en-de"
            # TODO more pairs in future
        }

        self.models = {}
        self.tokenizers = {}

        for src_lang, tgt_lang in self.supported_pairs.keys():
            self._load_model(src_lang, tgt_lang)

    def _load_model(self, src_lang: Language, tgt_lang: Language) -> None:
        # models are downloaded to ~/.cache/huggingface

        print(f"Loading model {src_lang.name}->{tgt_lang.name}", file=sys.stderr)

        pair = (src_lang, tgt_lang)

        if pair not in self.supported_pairs:
            raise ValueError(f"Unsupported language pair: {src_lang.value}->{tgt_lang.value}")

        if pair not in self.models:
            model_name = self.supported_pairs[pair]
            self.tokenizers[pair] = MarianTokenizer.from_pretrained(model_name)
            self.models[pair] = MarianMTModel.from_pretrained(model_name)

    def _translate_direct(self, src_lang: Language, tgt_lang: Language, text: str, **generation_kwargs) -> str:
        pair = (src_lang, tgt_lang)

        if pair not in self.supported_pairs:
            raise ValueError(f"Pair {src_lang}-> {tgt_lang} not supported")

        tokenizer = self.tokenizers[pair]
        model = self.models[pair]

        batch = tokenizer([text], return_tensors="pt", truncation=True)

        translated = model.generate(**batch, **generation_kwargs)

        return tokenizer.batch_decode(translated, skip_special_tokens=True)[0]

    def _get_translation_chain(self, src_lang: Language, tgt_lang: Language) -> list[Language]:
        # Direct translation
        if (src_lang, tgt_lang) in self.supported_pairs:
            return [src_lang, tgt_lang]

        # Try to find a path through English as intermediate language
        if (src_lang, Language.EN) in self.supported_pairs and (Language.EN, tgt_lang) in self.supported_pairs:
            return [src_lang, Language.EN, tgt_lang]

        # Add more possible paths if needed

        raise ValueError(f"No translation path found from {src_lang.value} to {tgt_lang.value}")

    def _translate_chain(self, chain: list[Language], text: str, **generation_kwargs) -> str:
        for src_lang, tgt_lang in zip(chain[:-1], chain[1:]):
            text = self._translate_direct(src_lang, tgt_lang, text, **generation_kwargs)
        return text

    def translate(self, src_lang: Language, tgt_lang: Language, text: str, **generation_kwargs) -> str:
        if src_lang == tgt_lang:
            return text

        chain = self._get_translation_chain(src_lang, tgt_lang)
        text = self._translate_chain(chain, text, **generation_kwargs)
        return text

    def translate_batch(self, src_lang: Language, tgt_lang: Language, texts: list[str], **generation_kwargs) -> list[str]:
        return [
            self.translate(src_lang, tgt_lang, text, **generation_kwargs)
            for text in texts
        ]


if __name__ == "__main__":
    # to run it this file (from "backend/" dir):
    # $ python -m app.translation

    translator = Translator()

    # direct translations
    print(translator.translate(Language.EN, Language.DE, "Hello"))
    print(translator.translate(Language.PL, Language.EN, "Cześć"))
    print(translator.translate_batch(Language.PL, Language.EN, ["Jabłko", "Gruszka", "Malina"]))

    # chain translations
    print(translator._translate_chain([Language.PL, Language.EN, Language.DE], "Cześć"))
    print(translator.translate(Language.PL, Language.DE, "Cześć"))

    # singleton
    translator2 = Translator()
    print(translator2 is translator)  # True
