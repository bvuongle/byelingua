import csv
import tempfile
from pathlib import Path
from unittest.mock import Mock

import pytest

from app.file_handler.csv_file_handler import CSVFileHandler
from app.models import File


@pytest.fixture
def sample_csv():
    content = "Name,Age,Email,City,State,Country,Phone\nJohn,30,john@example.com,New York,NY,USA,1234567890"
    with tempfile.NamedTemporaryFile(mode="w+", delete=False, newline="") as tmp:
        tmp.write(content)
        tmp.seek(0)
        yield Path(tmp.name)


@pytest.fixture
def empty_csv():
    with tempfile.NamedTemporaryFile(mode="w+", delete=False, newline="") as tmp:
        tmp.seek(0)
        yield Path(tmp.name)


@pytest.fixture
def malformed_csv():
    content = "Name;Age;Email\nJohn;30;john@example.com"  # Incorrect delimiter
    with tempfile.NamedTemporaryFile(mode="w+", delete=False, newline="") as tmp:
        tmp.write(content)
        tmp.seek(0)
        yield Path(tmp.name)


@pytest.fixture
def mock_storage_manager():
    manager = Mock()

    def open_file(file_path, mode):
        return open(file_path, mode, newline="")

    manager.open_file.side_effect = open_file
    return manager


@pytest.fixture
def mock_file(sample_csv):
    file = Mock(spec=File)
    file.file_path = sample_csv
    file.selected_columns = [1, 5, 6]  # Age, Country, Phone
    return file


@pytest.fixture
def handler(mock_storage_manager, mock_file):
    return CSVFileHandler(mock_storage_manager, mock_file)


def test_read_headers(handler):
    headers = handler.read_headers()
    assert headers == ["Name", "Age", "Email", "City", "State", "Country", "Phone"]


def test_read_selected_columns(handler):
    result = handler.read_row(1)
    assert result == ["30", "USA", "1234567890"]

def test_read_negative_row(handler):
    with pytest.raises(IndexError, match="Row number cannot be negative: -1"):
        handler.read_row(-1)

def test_write_selected_columns(handler, mock_file):
    handler.write_row(1, ["35", "Canada", "9876543210"])
    with open(mock_file.file_path, "r") as f:
        lines = list(csv.reader(f))
    assert lines[1] == [
        "John",
        "35",
        "john@example.com",
        "New York",
        "NY",
        "Canada",
        "9876543210",
    ]


def test_read_invalid_row(handler):
    with pytest.raises(IndexError, match="Row 10 not found."):
        handler.read_row(10)


def test_write_invalid_row(handler):
    with pytest.raises(IndexError, match="Row 10 is out of range."):
        handler.write_row(10, ["40", "Mexico", "0001112222"])


def test_selected_columns_out_of_range_read(mock_storage_manager, sample_csv):
    file = Mock(spec=File)
    file.file_path = sample_csv
    file.selected_columns = [1, 10]  # Invalid column index
    handler = CSVFileHandler(mock_storage_manager, file)
    with pytest.raises(IndexError, match="selected column indices are out of range"):
        handler.read_row(1)


def test_selected_columns_out_of_range_write(mock_storage_manager, sample_csv):
    file = Mock(spec=File)
    file.file_path = sample_csv
    file.selected_columns = [1, 10]  # Invalid column index
    handler = CSVFileHandler(mock_storage_manager, file)
    with pytest.raises(
        IndexError, match="selected column indices are out of range during write"
    ):
        handler.write_row(1, ["35", "Canada"])


def test_get_row_count(handler):
    count = handler.get_row_count()
    assert count == 1


def test_empty_file_header_read(mock_storage_manager, empty_csv):
    file = Mock(spec=File)
    file.file_path = empty_csv
    file.selected_columns = [0]
    handler = CSVFileHandler(mock_storage_manager, file)
    with pytest.raises(StopIteration):
        handler.read_headers()


def test_malformed_csv_read(mock_storage_manager, malformed_csv):
    file = Mock(spec=File)
    file.file_path = malformed_csv
    file.selected_columns = [1]
    handler = CSVFileHandler(mock_storage_manager, file)
    with pytest.raises(IndexError):
        handler.read_row(1)
