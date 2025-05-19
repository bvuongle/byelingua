import { useState, useEffect, useRef, useCallback } from "react";
import {
  Container,
  Heading,
  Flex,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  type FilesGetFileResponse,
  FilesGetFileRowResponse,
  FilesService,
} from "@/client";
import useCustomToast from "@/hooks/useCustomToast";
import { useShortcuts } from "@/hooks/useShortcuts";
import {useRowHotkeys} from "@/hooks/useRowHotkeys.ts";
import {NavButton} from "@/components/Translate/NavButton.tsx";
import {MuiRowEditor} from "@/components/Translate/MuiRowEditor.tsx";

export const Route = createFileRoute(
  "/_layout/files/$fileId/translate/$rowIndex",
)({
  component: TranslateRowPage,
});

export function TranslateRowPage() {
  const { fileId, rowIndex } = Route.useParams();
  const navigate = useNavigate();
  const toast = useCustomToast();
  const qc = useQueryClient();
  const actualIndex = parseInt(rowIndex, 10);

  const {
    data: fileMeta,
    isLoading: filesLoading,
    isError: filesError,
  } = useQuery<FilesGetFileResponse>({
    queryKey: ["files", fileId],
    queryFn: () => FilesService.getFile({ fileId }),
  });

  const selectedRows = fileMeta
    ? fileMeta.selected_rows?.length
      ? fileMeta.selected_rows
      : Array.from({ length: fileMeta.total_rows! }, (_, i) => i)
    : [];

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
    queryFn: () => FilesService.getFileRow({ fileId, rowIndex: actualIndex }),
    enabled: selectedRows.length > 0,
  });

  const [cols, setCols] = useState<
    { column_name: string; original: string; translation: string }[]
  >([]);
  const initialCols = useRef<typeof cols>([]);

  useEffect(() => {
    if (rowData) {
      const mapped = rowData.columns.map((c) => ({
        ...c,
        translation: c.translation ?? "",
      }));
      setCols(mapped);
      initialCols.current = mapped;
    }
  }, [rowData]);

  const hasUnsavedChanges =
    initialCols.current.length > 0 &&
    cols.some((c, i) => c.translation !== initialCols.current[i].translation);

  const saveMutation = useMutation({
    mutationFn: () =>
      FilesService.updateFileRow({
        fileId,
        rowIndex: actualIndex,
        requestBody: { row_index: actualIndex, columns: cols },
      }),
    onSuccess: (data) => {
      toast.showSuccessToast("Row saved");
      qc.setQueryData(["file-row", fileId, actualIndex], () => data);
      refetchRow();
    },
    onError: () => toast.showErrorToast("Failed to save row"),
  });

  const { shortcuts } = useShortcuts();

  const goPrev = useCallback(() => {
    if (hasPrev)
      navigate({
        to: `/files/${fileId}/translate/${selectedRows[pos - 1]}`,
      });
  }, [hasPrev, navigate, fileId, selectedRows, pos]);

  const goNext = useCallback(() => {
    if (hasNext)
      navigate({
        to: `/files/${fileId}/translate/${selectedRows[pos + 1]}`,
      });
  }, [hasNext, navigate, fileId, selectedRows, pos]);

  const save = useCallback(() => {
    if (!hasUnsavedChanges || saveMutation.isPending) return;
    saveMutation.mutate();
  }, [hasUnsavedChanges, saveMutation]);

  const saveAndNext = useCallback(async () => {
    if (!hasNext || saveMutation.isPending) return;
    await saveMutation.mutateAsync();
    goNext();
  }, [hasNext, saveMutation, goNext]);

  useRowHotkeys(shortcuts, { goPrev, goNext, save, saveAndNext });

  if (filesLoading || rowLoading) {
    return (
      <Container centerContent py={16}>
        <Spinner size="xl" />
      </Container>
    );
  }
  if (filesError || rowError || !rowData) {
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

      <MuiRowEditor cols={cols} setCols={setCols} />

      <Flex gap={4} justify="center">
        <NavButton
          onClick={goPrev}
          disabled={!hasPrev}
          label="Previous Row"
          shortcut={shortcuts.previous}
        />
        <NavButton
          onClick={() => saveMutation.mutate()}
          disabled={!hasUnsavedChanges || saveMutation.isPending}
          label="Apply Changes"
          shortcut={shortcuts.accept}
          colorScheme="blue"
          loading={saveMutation.isPending}
        />
        <NavButton
          onClick={saveAndNext}
          disabled={!hasNext || saveMutation.isPending}
          label="Apply and Next Row"
          shortcut={shortcuts.accept_and_next}
        />
        <NavButton
          onClick={goNext}
          disabled={!hasNext}
          label="Next Row"
          shortcut={shortcuts.skip}
        />
      </Flex>
    </Container>
  );
}
