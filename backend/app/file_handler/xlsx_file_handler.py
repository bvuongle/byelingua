import openpyxl
from openpyxl.utils.exceptions import (
    InvalidFileException,
    ReadOnlyWorkbookException,
    SheetTitleException,
)

from app.file_handler.file_handler import FileHandler
from app.file_handler.file_handler_factory import FileHandlerFactory
from app.models import FileFormat


@FileHandlerFactory.register_handler(FileFormat.xlsx)
class XLSXFileHandler(FileHandler):
    """
    File Handler for XLSX Files. Reads and writes only specified selected_columns.
    Uses openpyxl for file manipulation.
    """

    def read_headers(self) -> list[str]:
        with self.storage_manager.open_file(self.file.file_path, "rb") as file:
            wb = openpyxl.load_workbook(file, read_only=True)
            sheet = wb.active
            return [cell.value for cell in next(sheet.iter_rows(min_row=1, max_row=1))]

    def read_row(self, row_number: int) -> list[str]:
        if row_number < 0:
            raise IndexError(f"Row number cannot be negative: {row_number}")

        with self.storage_manager.open_file(self.file.file_path, "rb") as file:
            wb = openpyxl.load_workbook(file, read_only=True)
            sheet = wb.active
            for idx, row in enumerate(sheet.iter_rows(min_row=2), start=1):
                if idx == row_number:
                    try:
                        return [row[i].value for i in self.file.selected_columns]
                    except IndexError:
                        raise IndexError(
                            "One or more selected column indices are out of range."
                        )
        raise IndexError(f"Row {row_number} not found.")

    def write_row(self, row_number: int, row_data: list[str]) -> None:
        if row_number < 0:
            raise IndexError(f"Row number cannot be negative: {row_number}")

        with self.storage_manager.open_file(self.file.file_path, "rb") as file:
            wb = openpyxl.load_workbook(file)
            sheet = wb.active

        if row_number + 1 > sheet.max_row:
            raise IndexError(f"Row {row_number} is out of range.")

        # Check if any selected column index is out of range before writing
        max_col = sheet.max_column
        for col_index in self.file.selected_columns:
            if col_index >= max_col:
                raise IndexError(
                    "One or more selected column indices are out of range during write."
                )

        try:
            for i, col_index in enumerate(self.file.selected_columns):
                sheet.cell(row=row_number + 1, column=col_index + 1, value=row_data[i])
        except IndexError:
            raise IndexError(
                "One or more selected column indices are out of range during write."
            )

        with self.storage_manager.open_file(self.file.file_path, "wb") as file:
            wb.save(file)

    def get_row_count(self) -> int:
        with self.storage_manager.open_file(self.file.file_path, "rb") as file:
            wb = openpyxl.load_workbook(file, read_only=True)
            sheet = wb.active
            return sheet.max_row - 1  # excluding header

    def get_preview(self, row_count: int) -> list[list[str]]:
        with self.storage_manager.open_file(self.file.file_path, "rb") as file:
            wb = openpyxl.load_workbook(file, read_only=True)
            sheet = wb.active
            preview = []
            for idx, row in enumerate(sheet.iter_rows(min_row=2), start=1):
                if idx > row_count:
                    break
                preview.append([cell.value for cell in row])
            return preview

    def validate_file(self) -> bool:
        with self.storage_manager.open_file(self.file.file_path, "rb") as file:
            try:
                wb = openpyxl.load_workbook(file, read_only=True)
                sheet = wb.active
                headers = [
                    cell.value for cell in next(sheet.iter_rows(min_row=1, max_row=1))
                ]
                if not headers:
                    return False
                return True
            except (
                InvalidFileException,
                ReadOnlyWorkbookException,
                SheetTitleException,
                StopIteration,
            ):
                return False
