from abc import ABC, abstractmethod
from app.storage_manager.storage_manager import StorageManager
from app.models import File


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
