import tempfile
from pathlib import Path
from unittest.mock import Mock

import pytest
from openpyxl import Workbook, load_workbook

from app.file_handler.xlsx_file_handler import XLSXFileHandler
from app.models import File


@pytest.fixture
def sample_xlsx():
    wb = Workbook()
    ws = wb.active
    ws.append(["Name", "Age", "Email", "City", "State", "Country", "Phone"])
    ws.append(["John", 30, "john@example.com", "New York", "NY", "USA", "1234567890"])
    path = Path(tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False).name)
    wb.save(path)
    return path


@pytest.fixture
def mock_storage_manager():
    manager = Mock()

    def open_file(file_path, mode):
        if "b" in mode:
            return open(file_path, mode)
        return open(file_path, mode, newline="")

    manager.open_file.side_effect = open_file
    return manager


@pytest.fixture
def mock_file(sample_xlsx):
    file = Mock(spec=File)
    file.file_path = sample_xlsx
    file.selected_columns = [1, 5, 6]  # Age, Country, Phone
    return file


@pytest.fixture
def handler(mock_storage_manager, mock_file):
    return XLSXFileHandler(mock_storage_manager, mock_file)


def test_read_headers(handler):
    headers = handler.read_headers()
    assert headers == ["Name", "Age", "Email", "City", "State", "Country", "Phone"]


def test_read_selected_columns(handler):
    row = handler.read_row(1)
    assert row == [30, "USA", "1234567890"]

def test_read_negative_row(handler):
    with pytest.raises(IndexError, match="Row number cannot be negative: -1"):
        handler.read_row(-1)

def test_write_selected_columns(handler, mock_file):
    handler.write_row(1, [35, "Canada", "9876543210"])
    wb = load_workbook(mock_file.file_path)
    ws = wb.active
    assert ws.cell(row=2, column=2).value == 35
    assert ws.cell(row=2, column=6).value == "Canada"
    assert ws.cell(row=2, column=7).value == "9876543210"


def test_get_row_count(handler):
    assert handler.get_row_count() == 1


def test_out_of_bounds_row(handler):
    with pytest.raises(IndexError, match="Row 10 not found"):
        handler.read_row(10)


def test_out_of_bounds_column_read(mock_storage_manager, sample_xlsx):
    file = Mock(spec=File)
    file.file_path = sample_xlsx
    file.selected_columns = [1, 10]  # Invalid column
    handler = XLSXFileHandler(mock_storage_manager, file)
    with pytest.raises(IndexError, match="selected column indices are out of range"):
        handler.read_row(1)


def test_out_of_bounds_column_write(mock_storage_manager, sample_xlsx):
    file = Mock(spec=File)
    file.file_path = sample_xlsx
    file.selected_columns = [1, 10]  # Invalid column
    handler = XLSXFileHandler(mock_storage_manager, file)
    with pytest.raises(
        IndexError, match="selected column indices are out of range during write"
    ):
        handler.write_row(1, [35, "Canada"])
