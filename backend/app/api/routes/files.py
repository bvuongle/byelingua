import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.api.deps import CurrentUser, FileServiceDep, SessionDep, TranslatorDep
from app.crud import update_file as crud_update_file
from app.file_handler.file_handler import FileHandler
from app.file_handler.file_handler_factory import FileHandlerFactory
from app.models import (
    ColumnTranslation,
    FilePreview,
    FilePublic,
    FileRow,
    FileUpdate,
    Message,
)


router = APIRouter(prefix="/files", tags=["files"])


@router.post("/upload")
async def upload_file(
    *,
    file: UploadFile,
    current_user: CurrentUser,
    file_service: FileServiceDep,
) -> Any:
    """
    Upload a file to the server.
    """
    uploaded_file = await file_service.upload_file(file, current_user)

    return uploaded_file


@router.get("/", response_model=list[FilePublic])
async def list_files(*, current_user: CurrentUser) -> Any:
    """
    List all files uploaded by the current user.
    """
    return current_user.files


@router.get("/{file_id}/download")
async def download_file(
    *,
    file_id: uuid.UUID,
    current_user: CurrentUser,
    file_service: FileServiceDep,
) -> FileResponse:
    """
    Download a file from the server.
    """
    return file_service.download_file(file_id, current_user)


@router.delete("/{file_id}", response_model=Message)
async def delete_file(
    *, file_id: uuid.UUID, current_user: CurrentUser, file_service: FileServiceDep
) -> Any:
    """
    Delete a file from the server.
    """
    await file_service.delete_file(file_id, current_user)

    return Message(message="File deleted successfully")


@router.get("/{file_id}/row/{row_index}", response_model=FileRow)
def get_file_row(
    *,
    file_id: uuid.UUID,
    row_index: int,
    current_user: CurrentUser,
    file_service: FileServiceDep,
    translator: TranslatorDep,
) -> Any:
    file_record = file_service.get_file_record(file_id, current_user.id)
    file_handler: FileHandler = FileHandlerFactory.create_handler(
        file_service.storage_manager, file_record
    )
    headers = file_record.headers
    selected_headers = [
        header
        for idx, header in enumerate(headers)
        if idx in file_record.selected_columns
    ]
    content = file_handler.read_row(row_index)

    translation = translator.translate_batch(
        src_lang=file_record.source_language,
        tgt_lang=file_record.target_language,
        texts=content,
    )

    elements: list[ColumnTranslation] = [
        ColumnTranslation(
            column_name=column_name, original=original, translation=translated
        )
        for column_name, original, translated in zip(
            selected_headers, content, translation, strict=False
        )
    ]

    response = FileRow(row_index=row_index, columns=elements)
    return response


@router.post("/{file_id}/row/{row_index}", response_model=FileRow)
def update_file_row(
    *,
    file_id: uuid.UUID,
    row_index: int,
    payload: FileRow,
    current_user: CurrentUser,
    file_service: FileServiceDep,
    session: SessionDep,
) -> Any:
    file_record = file_service.get_file_record(file_id, current_user.id)
    file_handler: FileHandler = FileHandlerFactory.create_handler(
        file_service.storage_manager, file_record
    )

    elements = [element.translation for element in payload.columns]
    file_handler.write_row(row_index, elements)

    headers = file_record.headers
    selected_headers = [
        header
        for idx, header in enumerate(headers)
        if idx in file_record.selected_columns
    ]
    content = file_handler.read_row(row_index)

    response_elements: list[ColumnTranslation] = [
        ColumnTranslation(
            column_name=column_name, original=original, translation=original
        )
        for column_name, original in zip(selected_headers, content, strict=False)
    ]

    response = FileRow(row_index=row_index, columns=response_elements)

    file_record.rows_completed = max(file_record.rows_completed, row_index + 1)
    file_record.last_modified = datetime.now()
    session.add(file_record)
    session.commit()

    return response


@router.get("/{file_id}/headers", response_model=list[str])
def get_file_headers(
    *,
    file_id: uuid.UUID,
    current_user: CurrentUser,
    file_service: FileServiceDep,
) -> Any:
    file_record = file_service.get_file_record(file_id, current_user.id)

    headers = file_record.headers
    return headers


@router.patch("/{file_id}/", response_model=FilePublic)
def update_file(
    *,
    file_id: uuid.UUID,
    payload: FileUpdate,
    current_user: CurrentUser,
    file_service: FileServiceDep,
    translator: TranslatorDep,
) -> Any:
    file_record = file_service.get_file_record(file_id, current_user.id)

    headers = file_record.headers
    if payload.selected_columns:
        if any(col >= len(headers) or col < 0 for col in payload.selected_columns):
            raise HTTPException(
                status_code=400,
                detail="Selected columns exceed the number of headers or is negative",
            )

    language_pair = (payload.source_language, payload.target_language)
    if language_pair not in translator.supported_pairs:
        raise HTTPException(
            status_code=400,
            detail="Unsupported language pair",
        )

    crud_update_file(session=file_service.db, db_file=file_record, file_in=payload)

    return file_record


@router.get("/{file_id}/preview", response_model=FilePreview)
def get_file_preview(
    *,
    file_id: uuid.UUID,
    current_user: CurrentUser,
    file_service: FileServiceDep,
) -> Any:
    file_record = file_service.get_file_record(file_id, current_user.id)
    file_handler: FileHandler = FileHandlerFactory.create_handler(
        file_service.storage_manager, file_record
    )

    headers = file_handler.read_headers()
    preview = file_handler.get_preview(row_count=20)
    return FilePreview(headers=headers, rows=preview)
