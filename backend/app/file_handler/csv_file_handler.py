import csv

from app.file_handler.file_handler import FileHandler
from app.file_handler.file_handler_factory import FileHandlerFactory
from app.models import FileFormat


@FileHandlerFactory.register_handler(FileFormat.csv)
class CSVFileHandler(FileHandler):
    """
    File Handler for CSV Files.
    """

    def read_headers(self) -> list[str]:
        with self.storage_manager.open_file(self.file.file_path, "r") as file:
            reader = csv.reader(file)
            headers = next(reader)
        return headers

    def read_row(self, row_number: int) -> list[str]:
        if row_number < 0:
            raise IndexError(f"Row number cannot be negative: {row_number}")

        with self.storage_manager.open_file(self.file.file_path, "r") as file:
            reader = csv.reader(file)
            for idx, row in enumerate(reader):
                if idx == row_number:
                    try:
                        return [row[i] for i in self.file.selected_columns]
                    except IndexError:
                        raise IndexError(
                            "One or more selected column indices are out of range."
                        )
        raise IndexError(f"Row {row_number} not found.")

    def write_row(self, row_number: int, row_data: list[str]) -> None:
        if row_number < 0:
            raise IndexError(f"Row number cannot be negative: {row_number}")
        with self.storage_manager.open_file(self.file.file_path, "r") as file:
            rows = list(csv.reader(file))

        if row_number >= len(rows):
            raise IndexError(f"Row {row_number} is out of range.")

        try:
            for i, col_index in enumerate(self.file.selected_columns):
                rows[row_number][col_index] = row_data[i]
        except IndexError:
            raise IndexError(
                "One or more selected column indices are out of range during write."
            )

        with self.storage_manager.open_file(self.file.file_path, "w") as file:
            writer = csv.writer(file)
            writer.writerows(rows)

    def get_row_count(self) -> int:
        with self.storage_manager.open_file(self.file.file_path, "r") as file:
            reader = csv.reader(file)
            try:
                next(reader)  # Skip header
            except StopIteration:
                return 0
            return sum(1 for _ in reader)

    def get_preview(self, row_count: int) -> list[list[str]]:
        with self.storage_manager.open_file(self.file.file_path, "r") as file:
            reader = csv.reader(file)
            next(reader)  # Skip header
            preview = []
            for idx, row in enumerate(reader):
                if idx < row_count:
                    preview.append([row[i] for i in self.file.selected_columns])
                else:
                    break
        return preview

    def validate_file(self) -> bool:
        with self.storage_manager.open_file(self.file.file_path, "r") as file:
            try:
                reader = csv.reader(file)
                headers = next(reader)
                if not headers:
                    return False
                for row in reader:
                    if len(row) != len(headers):
                        return False
            except (StopIteration, csv.Error):
                return False
        return True
