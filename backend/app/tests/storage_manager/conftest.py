from pathlib import Path
from typing import Generator

import pytest

from app.storage_manager.local_storage import LocalStorageManager
from app.storage_manager.storage_manager import StorageManager
from tempfile import TemporaryDirectory


@pytest.fixture(scope="session", autouse=True)
def local_storage() -> Generator[StorageManager, None, None]:
    with TemporaryDirectory() as d:
        yield LocalStorageManager(Path(d))
