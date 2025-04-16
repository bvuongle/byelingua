import uuid
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from app.file_handler.csv_file_handler import CSVFileHandler
from app.file_handler.file_handler_factory import FileHandlerFactory
from app.file_handler.xlsx_file_handler import XLSXFileHandler
from app.models import File, FileFormat


@pytest.fixture
def csv_file_obj():
    return File(
        id=uuid.uuid4(),
        filename="test.csv",
        format=FileFormat.csv,
        selected_columns=[0, 1],
        file_path=Path("test_file_path.csv"),
        owner_id=uuid.uuid4(),
    )


@pytest.fixture
def xlsx_file_obj():
    return File(
        id=uuid.uuid4(),
        filename="test.xlsx",
        format=FileFormat.xlsx,
        selected_columns=[0, 1],
        file_path=Path("test_file_path.xlsx"),
        owner_id=uuid.uuid4(),
    )


def test_create_handler_for_csv_returns_csv_handler(mock_storage_manager, csv_file_obj):
    # Act
    handler = FileHandlerFactory.create_handler(mock_storage_manager, csv_file_obj)

    # Assert
    assert isinstance(handler, CSVFileHandler)
    assert handler.file == csv_file_obj


def test_create_handler_for_xlsx_returns_xlsx_handler(
    mock_storage_manager, xlsx_file_obj
):
    # Act
    handler = FileHandlerFactory.create_handler(mock_storage_manager, xlsx_file_obj)

    # Assert
    assert isinstance(handler, XLSXFileHandler)
    assert handler.file == xlsx_file_obj


def test_create_handler_for_unsupported_format_raises_value_error(mock_storage_manager):
    # Arrange
    mock_file = MagicMock()
    mock_file.format = "unsupported_format"

    # Act & Assert
    with pytest.raises(ValueError) as exc_info:
        FileHandlerFactory.create_handler(mock_storage_manager, mock_file)

    assert "Unsupported file format" in str(exc_info.value)


# TODO: Figure out the mocking of FileFormat to test Registering
# def test_register_handler_decorator_adds_handler_to_registry():
#     # Arrange
#     MockFileFormat = MagicMock()
#     MockFileFormat.test_format = "test_format"
#
#     # Act - Register a new test handler
#     with mock.patch("app.models.FileFormat", MockFileFormat):
#         @FileHandlerFactory.register_handler(FileFormat.test_format)
#         class TestFileHandler(FileHandler):
#             def read_headers(self):
#                 return []
#
#             def read_row(self, row_number):
#                 return []
#
#             def write_row(self, row_number, row_data):
#                 pass
#
#             def get_row_count(self):
#                 return 0
#
#         # Assert
#         assert len(FileHandlerFactory._handlers) == original_count + 1
#         assert FileHandlerFactory._handlers[FileFormat.test_format] == TestFileHandler
