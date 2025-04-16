import tempfile
from pathlib import Path
from unittest.mock import Mock

import pytest
from openpyxl import Workbook


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
def sample_xlsx():
    wb = Workbook()
    ws = wb.active
    ws.append(["Name", "Age", "Email", "City", "State", "Country", "Phone"])
    ws.append(["John", 30, "john@example.com", "New York", "NY", "USA", "1234567890"])
    path = Path(tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False).name)
    wb.save(path)
    return path


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
