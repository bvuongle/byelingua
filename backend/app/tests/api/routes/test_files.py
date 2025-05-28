from __future__ import annotations

import io
import uuid
from pathlib import Path
from typing import Any, Dict, List

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.models import File, FileRow, Language
from app.tests.utils.user import (
    authentication_token_from_email,
    create_random_user,
)
from app.tests.utils.utils import upload_bytes


@pytest.fixture(autouse=True)
def override_translator_dependency(client: TestClient):
    from app.api.deps import get_translator
    from app.translation.languages import Language

    class DummyTranslator:
        def __init__(self):
            self.supported_pairs = {(Language.PL, Language.EN): "dummy"}

        def is_supported(self, src_lang: Language, tgt_lang: Language) -> bool:
            return (src_lang, tgt_lang) in self.supported_pairs

        def translate(
            self, src_lang: Language, tgt_lang: Language, text: str, **kw
        ) -> tuple[str, str]:
            return text + "_tx" if src_lang != tgt_lang else text, ""

        def translate_batch(
            self, src_lang: Language, tgt_lang: Language, texts: List[str], **kw
        ) -> list[tuple[str, str]]:
            return [self.translate(src_lang, tgt_lang, t, **kw) for t in texts]

    client.app.dependency_overrides[get_translator] = lambda: DummyTranslator()
    yield
    client.app.dependency_overrides.pop(get_translator, None)


@pytest.fixture(autouse=True)
def tmp_upload_dir(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(settings, "UPLOAD_PATH", tmp_path.as_posix())


CSV_CONTENT = "col1,col2\nfoo,bar\nbaz,qux\n"
HEADERS = ["col1", "col2"]
ROWS = [["foo", "bar"], ["baz", "qux"]]


def _upload_csv(
    client: TestClient, headers: Dict[str, str], filename: str = "sample.csv"
) -> Dict[str, Any]:
    files = {"file": (filename, io.BytesIO(CSV_CONTENT.encode()), "text/csv")}
    resp = client.post(
        f"{settings.API_V1_STR}/files/upload", files=files, headers=headers
    )
    assert resp.status_code == 200
    return resp.json()


def test_full_file_lifecycle(client: TestClient, db: Session) -> None:
    user = create_random_user(db)
    token_headers = authentication_token_from_email(
        client=client, email=user.email, db=db
    )

    file_pub = _upload_csv(client, token_headers)
    file_id = file_pub["id"]

    resp = client.get(f"{settings.API_V1_STR}/files/", headers=token_headers)
    assert resp.status_code == 200
    files = resp.json()
    assert any(f["id"] == file_id for f in files)

    resp = client.get(
        f"{settings.API_V1_STR}/files/{file_id}/headers", headers=token_headers
    )
    assert resp.status_code == 200
    assert resp.json() == HEADERS

    resp = client.get(
        f"{settings.API_V1_STR}/files/{file_id}/preview", headers=token_headers
    )
    assert resp.status_code == 200
    preview = resp.json()
    assert preview["headers"] == HEADERS
    assert preview["rows"] == ROWS

    resp = client.get(
        f"{settings.API_V1_STR}/files/{file_id}/row/1", headers=token_headers
    )
    assert resp.status_code == 200
    row = FileRow(**resp.json())
    assert row.row_index == 1
    assert [c.original for c in row.columns] == ROWS[0]

    new_values = ["AAA", "BBB"]
    payload = {
        "row_index": 1,
        "columns": [
            {
                "column_name": "col1",
                "original": "foo",
                "translation": new_values[0],
                "error_msg": "",
            },
            {
                "column_name": "col2",
                "original": "bar",
                "translation": new_values[1],
                "error_msg": "",
            },
        ],
    }
    resp = client.post(
        f"{settings.API_V1_STR}/files/{file_id}/row/1",
        headers=token_headers,
        json=payload,
    )
    assert resp.status_code == 200
    updated_row = FileRow(**resp.json())
    assert [c.original for c in updated_row.columns] == new_values

    resp = client.get(
        f"{settings.API_V1_STR}/files/{file_id}/row/1", headers=token_headers
    )
    row_again = FileRow(**resp.json())
    assert [c.original for c in row_again.columns] == new_values

    resp = client.get(
        f"{settings.API_V1_STR}/files/{file_id}/download", headers=token_headers
    )
    assert resp.status_code == 200
    assert new_values[0] in resp.content.decode()

    resp = client.delete(
        f"{settings.API_V1_STR}/files/{file_id}", headers=token_headers
    )
    assert resp.status_code == 200
    assert resp.json()["message"] == "File deleted successfully"

    resp = client.get(
        f"{settings.API_V1_STR}/files/{file_id}/headers", headers=token_headers
    )
    assert resp.status_code == 404


@pytest.mark.parametrize(
    "filename, status, detail",
    [
        ("bad.txt", 415, "not supported"),
        ("big.csv", 413, "exceeds"),
    ],
)
def test_upload_rejects_invalid_files(
    client: TestClient,
    monkeypatch,
    normal_user_token_headers: Dict[str, str],
    filename: str,
    status: int,
    detail: str,
) -> None:
    content = b"x" * (settings.UPLOAD_MAX_SIZE + 1) if "big" in filename else b"aaa"

    if "big" in filename:
        monkeypatch.setattr(settings, "UPLOAD_MAX_SIZE", 10)

    files = {"file": (filename, io.BytesIO(content), "text/plain")}
    resp = client.post(
        f"{settings.API_V1_STR}/files/upload",
        files=files,
        headers=normal_user_token_headers,
    )
    assert resp.status_code == status
    assert detail in resp.json()["detail"]


def test_file_permission_denied(client: TestClient, db: Session) -> None:
    owner = create_random_user(db)
    owner_headers = authentication_token_from_email(
        client=client, email=owner.email, db=db
    )
    file_pub = _upload_csv(client, owner_headers)
    file_id = file_pub["id"]

    attacker = create_random_user(db)
    attacker_headers = authentication_token_from_email(
        client=client, email=attacker.email, db=db
    )

    resp = client.get(
        f"{settings.API_V1_STR}/files/{file_id}/download", headers=attacker_headers
    )
    assert resp.status_code == 403

    resp = client.delete(
        f"{settings.API_V1_STR}/files/{file_id}", headers=attacker_headers
    )
    assert resp.status_code == 403


def test_update_file_validation_errors(client: TestClient, db: Session) -> None:
    user = create_random_user(db)
    headers = authentication_token_from_email(client=client, email=user.email, db=db)
    file_pub = _upload_csv(client, headers)
    fid = file_pub["id"]

    bad_column = {
        "source_language": Language.PL.value,
        "target_language": Language.ES.value,
        "selected_columns": [42],
    }
    resp = client.patch(
        f"{settings.API_V1_STR}/files/{fid}/",
        headers=headers,
        json=bad_column,
    )
    assert resp.status_code == 400
    assert "Selected columns exceed" in resp.json()["detail"]

    bad_language_pairs = {
        "source_language": Language.PL.value,
        "target_language": Language.ES.value,  # assuming PL->ES not in DummyTranslator
    }
    resp = client.patch(
        f"{settings.API_V1_STR}/files/{fid}/",
        headers=headers,
        json=bad_language_pairs,
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Unsupported language pair"


def test_translate_and_submit_row(client: TestClient, db: Session) -> None:
    content = b"pl,pl2\nkot,pies\n"
    user = create_random_user(db)
    hdrs = authentication_token_from_email(client=client, email=user.email, db=db)
    file_pub = upload_bytes(client, hdrs, content, "pl.csv")
    fid = file_pub["id"]

    r = client.get(f"{settings.API_V1_STR}/files/{fid}/row/0", headers=hdrs)
    row = FileRow(**r.json())
    assert all(c.translation.endswith("_tx") for c in row.columns)

    for c in row.columns:
        c.translation = c.translation.upper()

    payload = row.model_dump()
    r2 = client.post(
        f"{settings.API_V1_STR}/files/{fid}/row/0", headers=hdrs, json=payload
    )
    updated = FileRow(**r2.json())
    assert all(c.original == c.translation for c in updated.columns)


def test_delete_file_removes_disk_and_db(client: TestClient, db: Session) -> None:
    user = create_random_user(db)
    hdrs = authentication_token_from_email(client=client, email=user.email, db=db)

    file_pub = upload_bytes(client, hdrs, b"col\nval\n", "tiny.csv")
    fid = uuid.UUID(file_pub["id"])
    rel_path = Path(file_pub["file_path"])
    abs_path = Path(settings.UPLOAD_PATH) / rel_path
    assert abs_path.exists()

    r = client.delete(f"{settings.API_V1_STR}/files/{fid}", headers=hdrs)
    assert r.status_code == 200

    assert not abs_path.exists()
    assert db.exec(select(File).where(File.id == fid)).first() is None  # type: ignore[union-attr]
