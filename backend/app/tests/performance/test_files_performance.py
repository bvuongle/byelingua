from __future__ import annotations

import io
import time

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.tests.utils.user import (
    authentication_token_from_email,
    create_random_user,
)


HEADER = "c1,c2,c3\n"
ROW = "i am,you are,she is\n"
ROW_LEN = len(ROW.encode())


def _make_big_csv_bytes(size_in_mb: int = 10) -> bytes:
    target = size_in_mb * 1024 * 1024
    rows_needed = (target - len(HEADER)) // ROW_LEN + 1
    return HEADER.encode() + ROW.encode() * rows_needed


def _upload_bytes(
    client: TestClient, headers: dict, content: bytes, fname: str = "big.csv"
):
    files = {"file": (fname, io.BytesIO(content), "text/csv")}
    r = client.post(f"{settings.API_V1_STR}/files/upload", files=files, headers=headers)
    assert r.status_code == 200
    return r.json()


@pytest.mark.slow
def test_large_file_row_performance(
    client: TestClient, db: Session, monkeypatch
) -> None:
    monkeypatch.setattr(settings, "UPLOAD_MAX_SIZE", 200 * 1024 * 1024)

    user = create_random_user(db)
    hdrs = authentication_token_from_email(client=client, email=user.email, db=db)

    content = _make_big_csv_bytes(30)
    file_pub = _upload_bytes(client, hdrs, content)
    fid = file_pub["id"]

    BIG_ROW = 5_000

    r = client.get(f"{settings.API_V1_STR}/files/{fid}/row/1", headers=hdrs)

    t0 = time.perf_counter()
    r = client.get(f"{settings.API_V1_STR}/files/{fid}/row/{BIG_ROW}", headers=hdrs)
    t_get = time.perf_counter() - t0
    assert r.status_code == 200, r.text
    assert t_get < 5.0, f"Row retrieval took {t_get:.2f}s (>5s budget)"

    payload = r.json()
    for col in payload["columns"]:
        col["translation"] += "_edited"

    t0 = time.perf_counter()
    r2 = client.post(
        f"{settings.API_V1_STR}/files/{fid}/row/{BIG_ROW}", headers=hdrs, json=payload
    )
    t_post = time.perf_counter() - t0
    assert r2.status_code == 200, r2.text
    assert t_post < 5.0, f"Row update took {t_post:.2f}s (>5s budget)"
