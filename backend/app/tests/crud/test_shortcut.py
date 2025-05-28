from sqlmodel import Session

from app import crud
from app.models import Shortcuts, ShortcutsPublic
from app.tests.utils.user import create_random_user


def test_create_shortcuts(db: Session) -> None:
    user = create_random_user(db)
    shortcuts_data = ShortcutsPublic(
        skip="Ctrl + K",
        accept="Alt + L",
        accept_and_next="Ctrl + Shift + J",
        previous="Meta + P",
    )
    shortcut = crud.create_shortcuts(
        session=db, shortcuts_mapping=shortcuts_data, owner_id=user.id
    )
    assert shortcut.user_id == user.id
    assert shortcut.skip == "Ctrl + K"
    assert shortcut.accept_and_next == "Ctrl + Shift + J"


def test_update_shortcuts(db: Session) -> None:
    user = create_random_user(db)
    initial = ShortcutsPublic(
        skip="Ctrl + Q",
        accept="Alt + A",
        accept_and_next="Ctrl + Shift + W",
        previous="Meta + S",
    )
    shortcut = crud.create_shortcuts(
        session=db, shortcuts_mapping=initial, owner_id=user.id
    )

    update_data = ShortcutsPublic(
        skip="Ctrl + X",
        accept="Alt + Z",
        accept_and_next="Ctrl + Alt + S",
        previous="Ctrl + Y",
    )
    updated = crud.update_shortcuts(
        session=db, db_shortcut=shortcut, shortcuts_mapping=update_data
    )
    assert updated.skip == "Ctrl + X"
    assert updated.accept == "Alt + Z"
    assert updated.previous == "Ctrl + Y"


def test_delete_shortcuts(db: Session) -> None:
    user = create_random_user(db)
    shortcuts_data = ShortcutsPublic(
        skip="Ctrl + D",
        accept="Alt + E",
        accept_and_next="Ctrl + Shift + F",
        previous="Meta + G",
    )
    shortcut = crud.create_shortcuts(
        session=db, shortcuts_mapping=shortcuts_data, owner_id=user.id
    )

    crud.delete_shortcuts(session=db, db_shortcut=shortcut)
    retrieved = db.get(Shortcuts, shortcut.user_id)
    assert retrieved is None
