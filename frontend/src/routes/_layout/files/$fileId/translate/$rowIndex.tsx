import { useState, useEffect, useRef } from "react";
import {
  Container,
  Heading,
  Button,
  Flex,
  Spinner,
  Text,
  Input,
} from "@chakra-ui/react";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
} from "@mui/material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {FilesGetFileRowResponse, FilesService} from "@/client";
import useCustomToast from "@/hooks/useCustomToast";

export const Route = createFileRoute(
  "/_layout/files/$fileId/translate/$rowIndex"
)({
  component: TranslateRowPage,
});

function TranslateRowPage() {
  const { fileId, rowIndex } = Route.useParams();
  const navigate = useNavigate({ from: "/_layout/files/$fileId" });
  const toast = useCustomToast();
  const qc = useQueryClient();

  const actualIndex = parseInt(rowIndex, 10);

  const { data: selectedRows = [] } = useQuery<number[]>({
    queryKey: ["selectedRows", fileId],
    queryFn: () => qc.getQueryData<number[]>(["selectedRows", fileId]) ?? [],
  });

  const pos = selectedRows.findIndex((r) => r === actualIndex);
  const hasPrev = pos > 0;
  const hasNext = pos < selectedRows.length - 1;

  const {
    data: rowData,
    isLoading: rowLoading,
    isError: rowError,
    refetch: refetchRow,
  } = useQuery<FilesGetFileRowResponse>({
    queryKey: ["file-row", fileId, actualIndex],
    queryFn: async () =>
      FilesService.getFileRow({ fileId, rowIndex: actualIndex }),
    enabled: selectedRows.length > 0,
  });

  const [cols, setCols] = useState<
    { column_name: string; original: string; translation: string }[]
  >([]);
  const initialCols = useRef<typeof cols>([]);

  useEffect(() => {
    if (rowData) {
      setCols(
        rowData.columns.map((c) => ({
          ...c,
          translation: c.translation ?? "",
        }))
      );
      initialCols.current = rowData.columns.map((c) => ({
        ...c,
        translation: c.translation ?? "",
      }));
    }
  }, [rowData]);

  const hasUnsavedChanges =
    initialCols.current.length > 0 &&
    cols.some(
      (c, i) => c.translation !== initialCols.current[i].translation
    );

  const saveMutation = useMutation({
    mutationFn: () =>
      FilesService.updateFileRow({
        fileId,
        rowIndex: actualIndex,
        requestBody: { row_index: actualIndex, columns: cols },
      }),
    onSuccess: (data) => {
      toast.showSuccessToast("Row saved");
      qc.setQueryData(
        ["file-row", fileId, actualIndex],
        () => data
      );
      refetchRow().then();
    },
    onError: () => toast.showErrorToast("Failed to save row"),
  });

  if (rowLoading) {
    return (
      <Container centerContent py={16}>
        <Spinner size="xl" />
      </Container>
    );
  }
  if (rowError || !rowData) {
    return (
      <Container py={8}>
        <Text color="red.500">Error loading row {actualIndex}.</Text>
      </Container>
    );
  }

  return (
    <Container maxW="full" py={4}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="md">
          Row {pos + 1} of {selectedRows.length}
        </Heading>
        <Text fontSize="sm" color="fg">
          row #{actualIndex}
        </Text>
      </Flex>

      <TableContainer component={Paper} sx={{ mb: 6 }}>
        <Table>
          <TableHead>
            <TableRow>
              {cols.map((c) => (
                <TableCell key={c.column_name}>{c.column_name}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              {cols.map((c) => (
                <TableCell key={c.column_name}>{c.original}</TableCell>
              ))}
            </TableRow>
            <TableRow>
              {cols.map((c, idx) => (
                <TableCell key={c.column_name} sx={{ p: 1 }}>
                  <Input
                    value={c.translation}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCols((prev) =>
                        prev.map((col, i) =>
                          i === idx ? { ...col, translation: v } : col
                        )
                      );
                    }}
                  />
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Flex gap={4} justify={"center"}>
        <Button
          onClick={() =>
            navigate({
              to: `/files/${fileId}/translate/${selectedRows[pos - 1]}`,
            })
          }
          disabled={!hasPrev}
        >
          Previous Row
        </Button>
        <Button
          colorScheme="blue"
          onClick={() => saveMutation.mutate()}
          disabled={!hasUnsavedChanges || saveMutation.isPending}
        >
          {saveMutation.isPending ? "Saving…" : "Apply Changes"}
        </Button>
        <Button
            onClick={
            async () => {
                await saveMutation.mutateAsync();
                navigate({
                    to: `/files/${fileId}/translate/${selectedRows[pos + 1]}`,
                });
            }}
            disabled={!hasNext || saveMutation.isPending}
        >
            Apply and Next Row
        </Button>
        <Button
          onClick={() =>
            navigate({
              to: `/files/${fileId}/translate/${selectedRows[pos + 1]}`,
            })
          }
          disabled={!hasNext}
        >
          Next Row
        </Button>
      </Flex>
    </Container>
  );
}
