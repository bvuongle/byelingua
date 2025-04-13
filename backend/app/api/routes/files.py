import uuid
from typing import Any

from app.api.deps import CurrentUser, SessionDep, FileServiceDep
from app.models import FilePublic, Message
from fastapi import APIRouter, UploadFile
from fastapi.responses import Response

router = APIRouter(prefix="/files", tags=["files"])


@router.post("/upload")
async def upload_file(
    *,
    file: UploadFile,
    current_user: CurrentUser,
    db: SessionDep,
    file_service: FileServiceDep
) -> Any:
    """
    Upload a file to the server.
    """
    uploaded_file = await file_service.upload_file(file, current_user)

    return uploaded_file


@router.get("/", response_model=list[FilePublic])
async def list_files(*, current_user: CurrentUser, file_service: FileServiceDep) -> Any:
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
    *,
    file_id: uuid.UUID,
    current_user: CurrentUser,
    file_service: FileServiceDep
) -> Any:
    """
    Delete a file from the server.
    """
    await file_service.delete_file(file_id, current_user)

    return Message(message="File deleted successfully")
