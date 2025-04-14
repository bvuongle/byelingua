import typing
import uuid
from tempfile import TemporaryFile, TemporaryDirectory
from pathlib import Path

import pytest

from app.storage_manager.local_storage import LocalStorageManager

DATA = b"BINARY FILE CONTENTS"


def test_storage_manager_init():
    with TemporaryDirectory() as temp_dir:
        storage_path = Path(temp_dir) / Path("storage_test")
        assert not storage_path.exists()
        a = LocalStorageManager(storage_path)
        assert storage_path.exists()
        assert storage_path.is_dir()
        assert a.storage_path == storage_path


@pytest.mark.asyncio
async def test_file_create(local_storage: LocalStorageManager):
    file_path = Path("TEST.csv")
    await local_storage.create_file(file_path, DATA)
    saved_at = local_storage.storage_path / file_path
    assert saved_at.exists()
    assert saved_at.is_file()
    assert saved_at.stat().st_size == len(DATA)
    assert saved_at.read_bytes() == DATA


@pytest.mark.asyncio
async def test_file_create_with_existing_path(local_storage: LocalStorageManager):
    file_path = Path("TEST1.csv")
    await local_storage.create_file(file_path, DATA)
    assert (local_storage.storage_path / file_path).exists()

    with pytest.raises(FileExistsError):
        await local_storage.create_file(file_path, DATA)


async def test_read_file(local_storage: LocalStorageManager):
    file_path = Path("TEST2.csv")
    await local_storage.create_file(file_path, DATA)
    read_data = await local_storage.read_file(file_path)
    assert read_data == DATA


async def test_read_non_existing_file(local_storage: LocalStorageManager):
    file_path = Path("TEST3.csv")
    with pytest.raises(FileNotFoundError):
        await local_storage.create_file(file_path, DATA)


@pytest.mark.asyncio
async def test_file_exists(local_storage: LocalStorageManager):
    file_path = Path("TEST4.csv")
    assert not local_storage.file_exists(file_path)
    await local_storage.create_file(file_path, DATA)
    assert local_storage.file_exists(file_path)


@pytest.mark.asyncio
async def test_file_delete(local_storage: LocalStorageManager):
    file_path = Path("TEST5.csv")
    await local_storage.create_file(file_path, DATA)
    assert local_storage.file_exists(file_path)
    local_storage.delete_file(file_path)
    assert not local_storage.file_exists(file_path)
    assert not (local_storage.storage_path / file_path).exists()


@pytest.mark.asyncio
async def test_get_file_handle(local_storage: LocalStorageManager):
    file_path = Path("TEST6.csv")
    await local_storage.create_file(file_path, DATA)
    with local_storage.open_file(file_path, "rb") as handle:
        assert handle is not None
        assert handle.read() == DATA
