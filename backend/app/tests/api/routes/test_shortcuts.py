import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import default_shortcuts, settings
from app.models import Shortcuts
from app.tests.utils.utils import random_lower_string


SHORTCUTS_CREATE = {
    "skip": "ctrl+k",
    "accept": "Alt+L",
    "accept_and_next": "ctrl + shift + j",
    "previous": "Meta + P",
}

SHORTCUTS_UPDATE = {
    "skip": "Ctrl + X",
    "accept": "Alt + Z",
    "accept_and_next": "Ctrl + Alt + S",
    "previous": "Ctrl + Y",
}

INVALID_PAYLOADS = [
    {"skip": "Ctrll + P"},
    {"accept": "Ctrl + Ctrl + X"},
    {"accept_and_next": "P + Ctrl"},
    {"previous": "Ctrl + Unknown"},
    {"skip": ["Ctrl + K"]},
    {"accept": 123},
    {"skip": "K"},
    {"accept_and_next": "Ctrl + Shift + J", "extra_field": "value"},
    {"skip": "Ctrl + K", "accept": "Ctrl + K"},
]


def test_get_shortcuts_default(
    client: TestClient, db: Session, normal_user_token_headers: dict[str, str]
) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/shortcuts/", headers=normal_user_token_headers
    )
    assert r.status_code == 200
    assert r.json() == default_shortcuts
    assert len(db.exec(select(Shortcuts)).fetchall()) == 0


def test_set_shortcuts_create_and_update(
    client: TestClient, db: Session, normal_user_token_headers: dict[str, str]
) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/shortcuts/",
        headers=normal_user_token_headers,
        json=SHORTCUTS_CREATE,
    )
    assert r.status_code == 200
    created = r.json()
    assert created["skip"] == "Ctrl + K"
    assert created["accept_and_next"] == "Ctrl + Shift + J"

    shortcuts = db.exec(select(Shortcuts)).fetchall()
    assert len(shortcuts) == 1
    shortcut = shortcuts[0]
    assert shortcut.skip == "Ctrl + K"
    assert shortcut.accept_and_next == "Ctrl + Shift + J"

    r2 = client.post(
        f"{settings.API_V1_STR}/shortcuts/",
        headers=normal_user_token_headers,
        json=SHORTCUTS_UPDATE,
    )
    assert r2.status_code == 200
    updated = r2.json()
    assert updated["skip"] == "Ctrl + X"
    assert updated["accept"] == "Alt + Z"

    db.refresh(shortcut)
    assert shortcut.skip == "Ctrl + X"
    assert shortcut.accept == "Alt + Z"


def test_set_shortcuts_invalid_payload(
    client: TestClient, db: Session, normal_user_token_headers: dict[str, str]
) -> None:
    invalid_shortcuts = {"skip": "F5"}
    r = client.post(
        f"{settings.API_V1_STR}/shortcuts/",
        headers=normal_user_token_headers,
        json=invalid_shortcuts,
    )
    assert r.status_code == 422
    err = r.json()["detail"][0]
    assert err["loc"][-1] == "skip"


def test_delete_shortcuts_existing_and_default(
    client: TestClient, db: Session, normal_user_token_headers: dict[str, str]
) -> None:
    r1 = client.delete(
        f"{settings.API_V1_STR}/shortcuts/", headers=normal_user_token_headers
    )
    assert r1.status_code == 200
    assert r1.json() == default_shortcuts
    assert len(db.exec(select(Shortcuts)).fetchall()) == 0

    client.post(
        f"{settings.API_V1_STR}/shortcuts/",
        headers=normal_user_token_headers,
        json=SHORTCUTS_CREATE,
    )
    assert len(db.exec(select(Shortcuts)).fetchall()) == 1

    r2 = client.delete(
        f"{settings.API_V1_STR}/shortcuts/", headers=normal_user_token_headers
    )
    assert r2.status_code == 200
    assert r2.json() == default_shortcuts
    assert len(db.exec(select(Shortcuts)).fetchall()) == 0


@pytest.mark.parametrize("payload", INVALID_PAYLOADS)
def test_set_shortcuts_various_invalid_payloads(
    client: TestClient,
    db: Session,
    normal_user_token_headers: dict[str, str],
    payload: dict,
) -> None:
    """
    Any syntactically or semantically invalid shortcut must raise HTTP 422.
    """
    r = client.post(
        f"{settings.API_V1_STR}/shortcuts/",
        headers=normal_user_token_headers,
        json=payload,
    )
    assert r.status_code == 422
    assert r.json()["detail"]


def test_set_shortcuts_with_extra_field_rejected(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    payload = {
        "skip": "Ctrl + K",
        "unknown_field": "whatever",
    }
    r = client.post(
        f"{settings.API_V1_STR}/shortcuts/",
        headers=normal_user_token_headers,
        json=payload,
    )
    assert r.status_code == 422
    err = r.json()["detail"][0]
    assert err["type"] == "extra_forbidden"
    assert err["loc"][-1] == "unknown_field"


@pytest.mark.parametrize(
    "method, json_payload",
    [
        ("get", None),
        ("post", {"skip": "Ctrl + K"}),
        ("delete", None),
    ],
)
def test_shortcuts_unauthenticated_requests_are_rejected(
    client: TestClient,
    method: str,
    json_payload: dict | None,
) -> None:
    url = f"{settings.API_V1_STR}/shortcuts/"
    if method == "get":
        resp = client.get(url)
    elif method == "post":
        resp = client.post(url, json=json_payload)
    else:
        resp = client.delete(url)

    assert resp.status_code == 401
    assert resp.json()["detail"] == "Not authenticated"


def test_set_shortcuts_payload_not_object(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    raw_body = random_lower_string()
    resp = client.post(
        f"{settings.API_V1_STR}/shortcuts/",
        headers=normal_user_token_headers,
        json=raw_body,
    )
    assert resp.status_code == 422


def test_set_shortcuts_with_duplicate_shortcuts_rejected(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    payload = {
        "skip": "Ctrl + K",
        "accept": "Alt + M",
        "accept_and_next": "Ctrl + Shift + J",
        "previous": "Ctrl + K",  # Duplicate of skip
    }
    r = client.post(
        f"{settings.API_V1_STR}/shortcuts/",
        headers=normal_user_token_headers,
        json=payload,
    )
    assert r.status_code == 422
    assert r.json()["detail"]
    assert any(
        "used for both 'skip' and 'previous'" in d["msg"] for d in r.json()["detail"]
    )
