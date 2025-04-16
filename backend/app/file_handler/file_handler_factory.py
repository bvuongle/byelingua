from collections.abc import Callable
from typing import TypeVar

from app.file_handler.file_handler import FileHandler
from app.models import File, FileFormat
from app.storage_manager.storage_manager import StorageManager

T = TypeVar("T", bound=type[FileHandler])


class FileHandlerFactory:
    """
    Factory class for creating appropriate FileHandler instances based on file format.
    """

    _handlers: dict[FileFormat, type[FileHandler]] = {}

    @classmethod
    def create_handler(cls, storage_manager: StorageManager, file: File) -> FileHandler:
        """
        Creates and returns an appropriate FileHandler instance based on the file format.

        Args:
            storage_manager: The storage manager to use for file operations
            file: The file to create a handler for

        Returns:
            A FileHandler instance appropriate for the file's format

        Raises:
            ValueError: If the file format is not supported
        """
        handler_class = cls._handlers.get(file.format)
        if handler_class is None:
            supported_formats = ", ".join([f.value for f in FileFormat])
            raise ValueError(
                f"Unsupported file format: {file.format}. Supported formats are: {supported_formats}"
            )

        return handler_class(storage_manager, file)

    @classmethod
    def register_handler(cls, file_format: FileFormat) -> Callable[[T], T]:
        """
        Decorator to register a handler class for a specific file format.

        Args:
            file_format: The file format to register the handler for

        Returns:
            A decorator function that registers the handler class

        Example:
            @FileHandlerFactory.register_handler(FileFormat.csv)
            class CSVFileHandler(FileHandler):
                # Handler implementation
        """

        def decorator(handler_class: T) -> T:
            cls._handlers[file_format] = handler_class
            return handler_class

        return decorator
