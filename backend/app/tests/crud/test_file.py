from datetime import datetime
from pathlib import Path

from fastapi.encoders import jsonable_encoder
from sqlmodel import Session

from app import crud
from app.models import FileBase, FileUpdate, Language
from app.tests.utils.user import create_random_user


def test_create_file(db: Session) -> None:
    user = create_random_user(db)
    file_in = FileBase(
        filename="test.csv",
        file_path=Path("/tmp/test.csv"),
        source_language=Language.PL,
        target_language=Language.EN,
    )
    file = crud.create_file(session=db, file_in=file_in, owner_id=user.id)
    assert file.filename == "test.csv"
    assert file.owner_id == user.id
    assert file.file_path == Path("/tmp/test.csv")
    assert file.source_language == Language.PL
    assert file.target_language == Language.EN
    assert isinstance(file.created_at, datetime)
    assert isinstance(file.last_modified, datetime)


def test_get_file(db: Session) -> None:
    user = create_random_user(db)
    file_in = FileBase(
        filename="sample.csv",
        file_path=Path("/tmp/sample.csv"),
        source_language=Language.PL,
        target_language=Language.EN,
    )
    file = crud.create_file(session=db, file_in=file_in, owner_id=user.id)
    fetched = crud.get_file(session=db, file_id=file.id)
    assert fetched
    assert fetched.id == file.id
    assert jsonable_encoder(fetched) == jsonable_encoder(file)


def test_update_file(db: Session) -> None:
    user = create_random_user(db)
    file = crud.create_file(
        session=db,
        file_in=FileBase(
            filename="old.csv",
            file_path=Path("/tmp/old.csv"),
            source_language=Language.PL,
            target_language=Language.EN,
        ),
        owner_id=user.id,
    )

    update_data = FileUpdate(
        source_language=Language.EN,
        target_language=Language.PL,
        filename="new.csv",
        selected_rows=[1, 2],
        selected_columns=[0],
    )

    updated = crud.update_file(session=db, db_file=file, file_in=update_data)
    assert updated.filename == "new.csv"
    assert updated.source_language == Language.EN
    assert updated.target_language == Language.PL
    assert updated.selected_rows == [1, 2]
    assert updated.selected_columns == [0]


def test_delete_file(db: Session) -> None:
    user = create_random_user(db)
    file = crud.create_file(
        session=db,
        file_in=FileBase(
            filename="delete.csv",
            file_path=Path("/tmp/delete.csv"),
            source_language=Language.PL,
            target_language=Language.EN,
        ),
        owner_id=user.id,
    )

    crud.delete_file(session=db, file_id=file.id)
    assert crud.get_file(session=db, file_id=file.id) is None
