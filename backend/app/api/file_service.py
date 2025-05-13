import os
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.file_handler.file_handler_factory import FileHandlerFactory
from app.models import File, FileBase, FileFormat, User
from app.storage_manager.local_storage import LocalStorageManager


class FileService:
    def __init__(self, db: Session):
        self.db = db
        self.storage_manager = LocalStorageManager(Path(settings.UPLOAD_PATH))

    @staticmethod
    def validate_file(file: UploadFile) -> FileFormat:
        """Validate file before upload."""
        # Check file size
        file.file.seek(0, os.SEEK_END)
        file_size = file.file.tell()
        file.file.seek(0)  # Reset file position

        if file_size > settings.UPLOAD_MAX_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size exceeds maximum allowed size of {settings.UPLOAD_MAX_SIZE} bytes",
            )

        # Validate file format
        file_ext = os.path.splitext(file.filename)[1].lower().lstrip(".")
        try:
            file_format = FileFormat(file_ext)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"File format '{file_ext}' not supported. Allowed formats: {settings.UPLOAD_ALLOWED_FORMATS}",
            )

        if file_format not in settings.UPLOAD_ALLOWED_FORMATS:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"File format '{file_format}' not allowed. Allowed formats: {settings.UPLOAD_ALLOWED_FORMATS}",
            )

        return file_format

    async def upload_file(self, file: UploadFile, user: User) -> File:
        """Upload a file to the server."""
        # Validate file
        file_format = self.validate_file(file)

        # Generate unique filename to prevent collisions
        unique_filename = f"{uuid.uuid4()}_{file.filename}"
        file_path = Path(unique_filename)

        # Save file to disk
        try:
            # Get file size
            file.file.seek(0, os.SEEK_END)
            file.file.seek(0)  # Reset file position

            content = await file.read()
            try:
                await self.storage_manager.create_file(file_path, content)
            except FileExistsError:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="File already exists on server",
                )

            # Create database record
            db_file = FileBase(
                filename=file.filename,
                format=file_format,
                owner_id=user.id,
                file_path=file_path,
            )

            file_handler = FileHandlerFactory.create_handler(
                self.storage_manager,
                db_file,
            )
            if not file_handler.validate_file():
                self.storage_manager.delete_file(file_path)
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="File validation failed",
                )

            headers = file_handler.read_headers()
            db_file.selected_columns = list(range(len(headers)))
            db_file.headers = headers
            db_file.total_rows = file_handler.get_row_count()

            return crud.create_file(session=self.db, file_in=db_file, owner_id=user.id)
        except HTTPException as e:
            raise e
        except Exception as e:
            # Clean up file if database operation fails
            if self.storage_manager.file_exists(file_path):
                self.storage_manager.delete_file(file_path)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload file: {str(e)}",
            )

    def download_file(self, file_id: uuid.UUID, user: User) -> FileResponse:
        """Get file from the server."""
        file_record = self.get_file_record(file_id, user.id)

        # Check if file exists
        if not self.storage_manager.file_exists(file_record.file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="File not found on server"
            )
        return self.storage_manager.get_file_response(
            file_record.file_path, file_record.filename
        )

    async def delete_file(self, file_id: uuid.UUID, user: User) -> None:
        """Delete file from the server."""
        file_record = self.get_file_record(file_id, user.id)

        # Delete file from disk
        try:
            self.storage_manager.delete_file(file_record.file_path)
        except (FileNotFoundError, PermissionError):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete file",
            )

        crud.delete_file(session=self.db, file_id=file_id)

    def get_file_record(self, file_id: uuid.UUID, user_id: uuid.UUID) -> File:
        file_record = crud.get_file(session=self.db, file_id=file_id)

        if not file_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found or you don't have permission to access it",
            )

        if file_record.owner_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this file",
            )

        return file_record
