from abc import ABC, abstractmethod

from app.models import File
from app.storage_manager.storage_manager import StorageManager


class FileHandler(ABC):
    def __init__(self, storage_manager: StorageManager, file: File):
        self.storage_manager = storage_manager
        self.file = file

    @abstractmethod
    def read_headers(self) -> list[str]:
        pass

    @abstractmethod
    def read_row(self, row_number: int) -> list[str]:
        pass

    @abstractmethod
    def write_row(self, row_number: int, row_data: list[str]) -> None:
        pass

    @abstractmethod
    def get_row_count(self) -> int:
        pass

    @abstractmethod
    def validate_file(self) -> bool:
        pass

    @abstractmethod
    def get_preview(self, row_count: int) -> list[list[str]]:
        pass
