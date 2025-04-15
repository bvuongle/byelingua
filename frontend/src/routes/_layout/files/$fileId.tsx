import { Box, Container, Heading, Table } from "@chakra-ui/react";
import { useState } from "react";
import {createFileRoute} from "@tanstack/react-router";

// For demonstration, we simulate file preview data as a table of strings.
const dummyData = [
  ["Header 1", "Header 2", "Header 3"],
  ["Row 1 Col 1", "Row 1 Col 2", "Row 1 Col 3"],
  ["Row 2 Col 1", "Row 2 Col 2", "Row 2 Col 3"],
  ["Row 3 Col 1", "Row 3 Col 2", "Row 3 Col 3"],
];

function FilePreviewPage() {
  const { fileId } = Route.useParams()
  const [selectedCell, setSelectedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);

  const handleCellClick = (rowIndex: number, colIndex: number) => {
    setSelectedCell({ row: rowIndex, col: colIndex });
  };

  return (
    <Container maxW="full">
      <Heading size="lg" py={8}>
        File Preview: {fileId}
      </Heading>
      <Box mb={4}>
        {selectedCell ? (
          <Box>
            Selected Cell: Row {selectedCell.row + 1}, Column{" "}
            {selectedCell.col + 1}
          </Box>
        ) : (
          <Box>Click a cell to see its coordinates</Box>
        )}
      </Box>
      <Table.Root>
        <Table.Body>
          {dummyData.map((row, rowIndex) => (
            <Table.Row key={rowIndex}>
              {row.map((cell, colIndex) => (
                <Table.Cell
                  key={colIndex}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                  cursor="pointer"
                  _hover={{ bg: "gray.100" }}
                >
                  {cell}
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Container>
  );
}

export const Route = createFileRoute("/_layout/files/$fileId")({
  component: FilePreviewPage,
  validateSearch: () => ({}),
});

