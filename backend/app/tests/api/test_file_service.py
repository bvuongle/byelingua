import uuid
from io import BytesIO
from pathlib import Path
from unittest import mock

import pytest
from fastapi import UploadFile, HTTPException, status
from fastapi.responses import Response
from sqlmodel import Session

from app.api.file_service import FileService
from app.core.config import settings
from app.models import FileFormat, File
from app.tests.utils.user import create_random_user


@pytest.fixture
def mock_storage_manager():
    with mock.patch(
        "app.storage_manager.local_storage.LocalStorageManager", new=mock.AsyncMock()
    ) as mock_storage:
        instance = mock_storage.return_value
        instance.file_exists.return_value = True
        instance.read_file.return_value = b"test file content"
        yield instance


@pytest.fixture
def file_service(db: Session, mock_storage_manager):
    service = FileService(db)
    service.storage_manager = mock_storage_manager
    return service


@pytest.fixture
def mock_upload_file():
    content = b"test file content"
    file = BytesIO(content)
    upload_file = UploadFile(filename="test.csv", file=file)
    yield upload_file
    upload_file.file.close()


def test_validate_file_success(file_service, mock_upload_file):
    settings.UPLOAD_ALLOWED_FORMATS = [FileFormat.csv]
    settings.UPLOAD_MAX_SIZE = 1000000

    file_format = file_service.validate_file(mock_upload_file)

    assert file_format == FileFormat.csv.value


def test_validate_file_size_too_large(file_service, mock_upload_file):
    settings.UPLOAD_MAX_SIZE = 10

    with pytest.raises(HTTPException) as exc_info:
        pytest.mark.asyncio(file_service.validate_file(mock_upload_file))

    assert exc_info.value.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
    assert "File size exceeds maximum allowed size" in exc_info.value.detail


def test_validate_file_unsupported_format(file_service):
    content = b"test file content"
    file = BytesIO(content)
    upload_file = UploadFile(filename="test.xyz", file=file)

    settings.UPLOAD_ALLOWED_FORMATS = [FileFormat.csv]
    settings.UPLOAD_MAX_SIZE = 1000000

    with pytest.raises(HTTPException) as exc_info:
        pytest.mark.asyncio(file_service.validate_file(upload_file))

    assert exc_info.value.status_code == status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
    assert "not supported" in exc_info.value.detail

    upload_file.file.close()


@pytest.mark.asyncio
async def test_upload_file_success(file_service, mock_upload_file, db):
    user = create_random_user(db)
    mock_uuid = uuid.UUID("12345678-1234-5678-1234-567812345678")

    with mock.patch("app.crud.create_file") as mock_create_file, mock.patch(
        "uuid.uuid4", return_value=mock_uuid
    ):
        mock_db_file = mock.MagicMock(spec=File)
        mock_db_file.id = mock_uuid
        mock_db_file.filename = "test.txt"
        mock_create_file.return_value = mock_db_file

        settings.UPLOAD_ALLOWED_FORMATS = [FileFormat.csv]
        settings.UPLOAD_MAX_SIZE = 1000000

        result = await file_service.upload_file(mock_upload_file, user)

        assert result.id == mock_uuid
        assert result.filename == "test.txt"
        file_service.storage_manager.create_file.assert_called_once()
        mock_create_file.assert_called_once()


@pytest.mark.asyncio
async def test_upload_file_storage_error(file_service, mock_upload_file, db):
    user = create_random_user(db)
    file_service.storage_manager.create_file.side_effect = FileExistsError(
        "File already exists"
    )

    settings.UPLOAD_ALLOWED_FORMATS = [FileFormat.csv]
    settings.UPLOAD_MAX_SIZE = 1000000

    with pytest.raises(HTTPException) as exc_info:
        await file_service.upload_file(mock_upload_file, user)

    assert exc_info.value.status_code == status.HTTP_409_CONFLICT
    assert "File already exists" in exc_info.value.detail


@pytest.mark.asyncio
async def test_upload_file_other_error(file_service, mock_upload_file, db):
    user = create_random_user(db)
    file_service.storage_manager.create_file.side_effect = Exception("Unknown error")
    file_service.storage_manager.file_exists.return_value = True

    settings.UPLOAD_ALLOWED_FORMATS = [FileFormat.csv]
    settings.UPLOAD_MAX_SIZE = 1000000

    with pytest.raises(HTTPException) as exc_info:
        await file_service.upload_file(mock_upload_file, user)

    assert exc_info.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert "Failed to upload file" in exc_info.value.detail
    file_service.storage_manager.delete_file.assert_called_once()


@pytest.mark.asyncio
async def test_download_file_success(file_service, db):
    user = create_random_user(db)
    file_uuid = uuid.uuid4()
    mock_file_record = mock.MagicMock(spec=File)
    mock_file_record.file_path = Path("test_path.txt")
    mock_file_record.filename = "test.txt"
    mock_file_record.owner_id = user.id

    with mock.patch("app.crud.get_file", return_value=mock_file_record):
        response = await file_service.download_file(file_uuid, user)

        assert isinstance(response, Response)
        assert response.body == b"test file content"
        assert (
            response.headers["Content-Disposition"] == "attachment; filename=test.txt"
        )
        file_service.storage_manager.read_file.assert_called_once_with(
            Path("test_path.txt")
        )


@pytest.mark.asyncio
async def test_download_file_not_found_on_disk(file_service, db):
    user = create_random_user(db)
    file_uuid = uuid.uuid4()
    mock_file_record = mock.MagicMock()
    mock_file_record.file_path = "this_file_does_not_exist.txt"
    mock_file_record.owner_id = user.id
    mock_file_record.filename = "nonexistent.txt"

    with pytest.raises(HTTPException) as exc_info:
        await file_service.download_file(file_uuid, user)

    assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
    assert "File not found or you" in exc_info.value.detail


@pytest.mark.asyncio
async def test_download_file_record_not_found(file_service, db):
    user = create_random_user(db)
    file_uuid = uuid.uuid4()

    with mock.patch("app.crud.get_file", return_value=None):
        with pytest.raises(HTTPException) as exc_info:
            await file_service.download_file(file_uuid, user)
        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert "File not found or you don't have permission" in exc_info.value.detail


@pytest.mark.asyncio
async def test_download_file_not_owner(file_service, db):
    user = create_random_user(db)
    different_user_id = uuid.uuid4()
    file_uuid = uuid.uuid4()

    mock_file_record = mock.MagicMock(spec=File)
    mock_file_record.owner_id = different_user_id

    with mock.patch("app.crud.get_file", return_value=mock_file_record):
        with pytest.raises(HTTPException) as exc_info:
            await file_service.download_file(file_uuid, user)

        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert "do not have permission" in exc_info.value.detail


@pytest.mark.asyncio
async def test_delete_file_success(file_service, db):
    user = create_random_user(db)
    file_uuid = uuid.uuid4()

    mock_file_record = mock.MagicMock(spec=File)
    mock_file_record.file_path = Path("test_path.txt")
    mock_file_record.owner_id = user.id

    with mock.patch("app.crud.get_file", return_value=mock_file_record), mock.patch(
        "app.crud.delete_file"
    ) as mock_delete_file:
        await file_service.delete_file(file_uuid, user)

        file_service.storage_manager.delete_file.assert_called_once_with(
            Path("test_path.txt")
        )
        mock_delete_file.assert_called_once_with(
            session=file_service.db, file_id=file_uuid
        )


def test_get_file_record_success(file_service, db):
    # Setup
    user = create_random_user(db)
    file_uuid = uuid.uuid4()

    mock_file_record = mock.MagicMock(spec=File)
    mock_file_record.owner_id = user.id

    with mock.patch("app.crud.get_file", return_value=mock_file_record):
        result = file_service._get_file_record(file_uuid, user.id)

        assert result == mock_file_record


def test_get_file_record_not_found(file_service, db):
    user_id = uuid.uuid4()
    file_uuid = uuid.uuid4()

    with mock.patch("app.crud.get_file", return_value=None):
        with pytest.raises(HTTPException) as exc_info:
            file_service._get_file_record(file_uuid, user_id)

        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert "File not found" in exc_info.value.detail


def test_get_file_record_not_owner(file_service, db):
    user_id = uuid.uuid4()
    different_user_id = uuid.uuid4()
    file_uuid = uuid.uuid4()

    mock_file_record = mock.MagicMock(spec=File)
    mock_file_record.owner_id = different_user_id

    with mock.patch("app.crud.get_file", return_value=mock_file_record):
        # Execute and verify
        with pytest.raises(HTTPException) as exc_info:
            file_service._get_file_record(file_uuid, user_id)

        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert "do not have permission" in exc_info.value.detail
