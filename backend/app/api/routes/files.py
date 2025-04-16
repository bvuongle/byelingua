import uuid
from typing import Any

from fastapi import APIRouter, UploadFile
from fastapi.responses import Response

from app.api.deps import CurrentUser, FileServiceDep
from app.file_handler.file_handler import FileHandler
from app.file_handler.file_handler_factory import FileHandlerFactory
from app.models import ColumnTranslation, FilePublic, FileRow, Message

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
) -> Response:
    """
    Download a file from the server.
    """
    file_response = await file_service.download_file(file_id, current_user)
    return file_response


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
) -> Any:
    file_record = file_service.get_file_record(file_id, current_user.id)
    file_handler: FileHandler = FileHandlerFactory.create_handler(
        file_service.storage_manager, file_record
    )
    headers = file_handler.read_headers()
    content = file_handler.read_row(row_index)

    elements = [
        ColumnTranslation(
            column_name=column_name, original=original, translation=original
        )
        for column_name, original in zip(headers, content, strict=False)
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
) -> Any:
    file_record = file_service.get_file_record(file_id, current_user.id)
    file_handler: FileHandler = FileHandlerFactory.create_handler(
        file_service.storage_manager, file_record
    )

    elements = [element.translation for element in payload.columns]
    file_handler.write_row(row_index, elements)

    headers = file_handler.read_headers()
    content = file_handler.read_row(row_index)

    elements = [
        ColumnTranslation(
            column_name=column_name, original=original, translation=original
        )
        for column_name, original in zip(headers, content, strict=False)
    ]

    response = FileRow(row_index=row_index, columns=elements)
    return response
