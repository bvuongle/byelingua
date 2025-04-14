from contextlib import contextmanager
from pathlib import Path
from typing import TextIO, Generator

import aiofiles

from app.storage_manager.storage_manager import StorageManager


class LocalStorageManager(StorageManager):
    def __init__(self, storage_path: Path) -> None:
        super().__init__()
        self.storage_path = storage_path
        # Ensure upload directory exists
        self.storage_path.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def _handle_file_not_found(file_path: Path) -> None:
        """Check if a file exists in the storage."""
        if not file_path.exists():
            raise FileNotFoundError(f"File {file_path} not found.")

    async def create_file(self, file_path: Path, content: bytes) -> None:
        local_file_path = self.storage_path / file_path

        if local_file_path.exists():
            raise FileExistsError(f"File {file_path} already exists.")

        async with aiofiles.open(local_file_path, "wb") as out_file:
            await out_file.write(content)

    async def read_file(self, file_path: Path) -> bytes:
        local_file_path = self.storage_path / file_path
        self._handle_file_not_found(local_file_path)

        async with aiofiles.open(local_file_path, 'rb') as f:
            return await f.read()

    def delete_file(self, file_path: Path) -> None:
        local_file_path = self.storage_path / file_path
        self._handle_file_not_found(local_file_path)

        local_file_path.unlink()

    def file_exists(self, file_path: Path) -> bool:
        local_file_path = self.storage_path / file_path
        return local_file_path.exists()

    @contextmanager
    def open_file(self, file_path: Path, mode: str) -> Generator[TextIO, any, None]:
        local_file_path = self.storage_path / file_path
        self._handle_file_not_found(local_file_path)
        with open(local_file_path, mode) as f:
            yield f

