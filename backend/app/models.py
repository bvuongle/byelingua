import uuid
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any

import sqlalchemy.types as types
from pydantic import EmailStr
from sqlalchemy import Dialect
from sqlalchemy.sql.type_api import _T
from sqlmodel import JSON, Column, Field, Relationship, SQLModel

from app.translation.languages import Language


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=40)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=40)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore
    password: str | None = Field(default=None, min_length=8, max_length=40)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=40)
    new_password: str = Field(min_length=8, max_length=40)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    files: list["File"] = Relationship(back_populates="owner", cascade_delete=True)
    shortcuts: "Shortcuts" = Relationship(
        back_populates="owner", sa_relationship_kwargs={"uselist": False}
    )


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=40)


class FileFormat(str, Enum):
    csv = "csv"
    xlsx = "xlsx"


class PathType(types.TypeDecorator):
    """
    Type Decorator to create Path objects form database data
    """

    impl = types.String
    cache_ok = True

    def process_bind_param(self, value: _T | None, dialect: Dialect) -> Any:
        if isinstance(value, Path):
            return str(value)
        return value

    def process_result_value(self, value: Any | None, dialect: Dialect) -> Path | None:
        if value is not None:
            return Path(value)
        return value


class FileBase(SQLModel):
    filename: str = Field(max_length=255)
    format: FileFormat = Field(default=FileFormat.csv)
    rows_completed: int = Field(default=1)
    total_rows: int = Field(default=1)
    headers: list[str] = Field(sa_column=Column(JSON), default=[])
    selected_rows: list[int] = Field(sa_column=Column(JSON), default=[])
    selected_columns: list[int] = Field(sa_column=Column(JSON), default=[])
    created_at: datetime = Field(default_factory=lambda: datetime.now())
    last_modified: datetime = Field(default_factory=lambda: datetime.now())
    file_path: Path = Field(sa_column=Column(PathType))
    source_language: Language = Field(default=Language.PL)
    target_language: Language = Field(default=Language.EN)


class File(FileBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )

    owner: User | None = Relationship(back_populates="files")


class FilePublic(FileBase):
    id: uuid.UUID


class FileUpdate(SQLModel):
    source_language: Language = Field()
    target_language: Language = Field()
    filename: str | None = Field(default=None, max_length=255)
    selected_columns: list[int] = Field(sa_column=Column(JSON), default=[])
    selected_rows: list[int] = Field(sa_column=Column(JSON), default=[])


class ColumnTranslation(SQLModel):
    column_name: str
    original: str
    translation: str
    detected_language: Language | None
    error_msg: str


class FileRow(SQLModel):
    row_index: int | None
    columns: list[ColumnTranslation]


class FilePreview(SQLModel):
    headers: list[str]
    rows: list[list[str]]


class ShortcutsPublic(SQLModel):
    skip: str | None = Field(default=None)
    accept: str | None = Field(default=None)
    accept_and_next: str | None = Field(default=None)
    previous: str | None = Field(default=None)


class Shortcuts(ShortcutsPublic, table=True):
    user_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, primary_key=True, ondelete="CASCADE"
    )
    owner: User = Relationship(back_populates="shortcuts")
    skip: str | None = Field(default=None)
    accept: str | None = Field(default=None)
    accept_and_next: str | None = Field(default=None)
    previous: str | None = Field(default=None)
