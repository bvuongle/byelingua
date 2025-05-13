import uuid
from typing import Any

from sqlmodel import Session, select

from app.core.security import get_password_hash, verify_password
from app.models import (
    File,
    FileBase,
    FileUpdate,
    Shortcuts,
    ShortcutsPublic,
    User,
    UserCreate,
    UserUpdate,
)


def create_user(*, session: Session, user_create: UserCreate) -> User:
    db_obj = User.model_validate(
        user_create, update={"hashed_password": get_password_hash(user_create.password)}
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_user(*, session: Session, db_user: User, user_in: UserUpdate) -> Any:
    user_data = user_in.model_dump(exclude_unset=True)
    extra_data = {}
    if "password" in user_data:
        password = user_data["password"]
        hashed_password = get_password_hash(password)
        extra_data["hashed_password"] = hashed_password
    db_user.sqlmodel_update(user_data, update=extra_data)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


def get_user_by_email(*, session: Session, email: str) -> User | None:
    statement = select(User).where(User.email == email)
    session_user = session.exec(statement).first()  # type: ignore
    return session_user


def authenticate(*, session: Session, email: str, password: str) -> User | None:
    db_user = get_user_by_email(session=session, email=email)
    if not db_user:
        return None
    if not verify_password(password, db_user.hashed_password):
        return None
    return db_user


def create_file(*, session: Session, file_in: FileBase, owner_id: uuid.UUID) -> File:
    db_file = File.model_validate(file_in, update={"owner_id": owner_id})
    session.add(db_file)
    session.commit()
    session.refresh(db_file)
    return db_file


def delete_file(*, session: Session, file_id: uuid.UUID) -> None:
    statement = select(File).where(File.id == file_id)
    db_item = session.exec(statement).first()  # type: ignore
    session.delete(db_item)
    session.commit()


def get_file(*, session: Session, file_id: uuid.UUID) -> File | None:
    statement = select(File).where(File.id == file_id)
    db_item = session.exec(statement).first()  # type: ignore
    return db_item


def update_file(*, session: Session, db_file: File, file_in: FileUpdate) -> File:
    file_data = file_in.model_dump(exclude_unset=True)

    db_file.sqlmodel_update(file_data)
    session.add(db_file)
    session.commit()
    session.refresh(db_file)
    return db_file


def update_shortcuts(
    *, session: Session, db_shortcut: Shortcuts, shortcuts_mapping: ShortcutsPublic
) -> Shortcuts:
    db_shortcut.sqlmodel_update(shortcuts_mapping)

    session.add(db_shortcut)
    session.commit()
    session.refresh(db_shortcut)
    return db_shortcut


def create_shortcuts(
    *, session: Session, shortcuts_mapping: ShortcutsPublic, owner_id: uuid.UUID
) -> Shortcuts:
    ShortcutsPublic.model_validate(shortcuts_mapping)
    db_shortcut = Shortcuts.model_validate(
        shortcuts_mapping.model_dump(),
        update={"user_id": owner_id},
    )
    session.add(db_shortcut)
    session.commit()
    session.refresh(db_shortcut)
    return db_shortcut


def delete_shortcuts(*, session: Session, db_shortcut: Shortcuts) -> None:
    session.delete(db_shortcut)
    session.commit()
