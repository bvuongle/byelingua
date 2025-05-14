from abc import ABC, abstractmethod
from pathlib import Path
from typing import ContextManager, TextIO


class StorageManager(ABC):
    @abstractmethod
    def __init__(self) -> None:
        pass

    @abstractmethod
    async def create_file(self, file_path: Path, content: bytes) -> None:
        """Create a file in the storage."""
        pass

    @abstractmethod
    async def read_file(self, file_path: Path) -> bytes:
        """Read a file from the storage."""
        pass

    @abstractmethod
    def delete_file(self, file_path: Path) -> None:
        """Delete a file from the storage."""
        pass

    @abstractmethod
    def file_exists(self, file_path: Path) -> bool:
        """Check if a file exists in the storage."""
        pass

    @abstractmethod
    def open_file(self, file_path: Path, mode: str) -> ContextManager[TextIO]:
        """Yield a file handle"""
        pass
