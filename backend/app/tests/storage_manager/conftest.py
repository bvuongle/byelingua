from collections.abc import Generator
from pathlib import Path
from tempfile import TemporaryDirectory

import pytest

from app.storage_manager.local_storage import LocalStorageManager
from app.storage_manager.storage_manager import StorageManager


@pytest.fixture(scope="session", autouse=True)
def local_storage() -> Generator[StorageManager, None, None]:
    with TemporaryDirectory() as d:
        yield LocalStorageManager(Path(d))
