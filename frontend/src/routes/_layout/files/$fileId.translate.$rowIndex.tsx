import { useState, useEffect, useRef, useCallback } from "react"
import {
  Container,
  Heading,
  Button,
  Flex,
  Spinner,
  Text,
  Input,
  Kbd,
  Stack,
  HStack,
  Center,
} from "@chakra-ui/react"
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
} from "@mui/material"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  FilesGetFileRowResponse,
  FilesService,
} from "@/client"
import useCustomToast from "@/hooks/useCustomToast"
import { useShortcuts } from "@/hooks/useShortcuts"
import { useHotkeys } from "react-hotkeys-hook"

/* ───────────────────────── helpers ───────────────────────── */
const norm = (s: string) => s.replace(/\s*\+\s*/g, "+").toLowerCase()

const prettifyKey = (k: string) => {
  switch (k) {
    case "ctrl":  return "Ctrl"
    case "alt":   return "Alt"
    case "shift": return "Shift"
    case "meta":  return "Cmd"
    case "←":     return "←"
    case "→":     return "→"
    case "↑":     return "↑"
    case "↓":     return "↓"
    default:      return k.length === 1 ? k.toUpperCase() : k
  }
}

const ShortcutChips = ({ combo }: { combo?: string | null }) => {
  if (!combo) return null
  const parts = combo.split(/\s*\+\s*/).filter(Boolean)

  return (
      <Center>
        <HStack as="span" gap="0.5">
          {parts.map((p) => (
              <Kbd key={p} size="sm">
                {prettifyKey(p)}
              </Kbd>
          ))}
        </HStack>
      </Center>
  )
}

export const Route = createFileRoute(
    "/_layout/files/$fileId/translate/$rowIndex",
)({
  component: TranslateRowPage,
})

function TranslateRowPage() {
  /* ─── router / state basics ─── */
  const { fileId, rowIndex } = Route.useParams()
  const navigate = useNavigate({ from: "/_layout/files/$fileId" })
  const toast = useCustomToast()
  const qc = useQueryClient()
  const actualIndex = parseInt(rowIndex, 10)

  const { data: selectedRows = [] } = useQuery<number[]>({
    queryKey: ["selectedRows", fileId],
    queryFn : () => qc.getQueryData<number[]>(["selectedRows", fileId]) ?? [],
  })

  const pos      = selectedRows.findIndex((r) => r === actualIndex)
  const hasPrev  = pos > 0
  const hasNext  = pos < selectedRows.length - 1

  const {
    data: rowData,
    isLoading: rowLoading,
    isError:   rowError,
    refetch:   refetchRow,
  } = useQuery<FilesGetFileRowResponse>({
    queryKey: ["file-row", fileId, actualIndex],
    queryFn : () =>
        FilesService.getFileRow({ fileId, rowIndex: actualIndex }),
    enabled : selectedRows.length > 0,
  })

  const [cols, setCols] = useState<
      { column_name: string; original: string; translation: string }[]
  >([])
  const initialCols = useRef<typeof cols>([])

  useEffect(() => {
    if (rowData) {
      const mapped = rowData.columns.map((c) => ({
        ...c,
        translation: c.translation ?? "",
      }))
      setCols(mapped)
      initialCols.current = mapped
    }
  }, [rowData])

  const hasUnsavedChanges =
      initialCols.current.length > 0 &&
      cols.some((c, i) => c.translation !== initialCols.current[i].translation)

  const saveMutation = useMutation({
    mutationFn: () =>
        FilesService.updateFileRow({
          fileId,
          rowIndex: actualIndex,
          requestBody: { row_index: actualIndex, columns: cols },
        }),
    onSuccess: (data) => {
      toast.showSuccessToast("Row saved")
      qc.setQueryData(["file-row", fileId, actualIndex], () => data)
      refetchRow()
    },
    onError: () => toast.showErrorToast("Failed to save row"),
  })

  const { shortcuts } = useShortcuts()

  const goPrev = useCallback(() => {
    if (hasPrev)
      navigate({
        to: `/files/${fileId}/translate/${selectedRows[pos - 1]}`,
      })
  }, [hasPrev, navigate, fileId, selectedRows, pos])

  const goNext = useCallback(() => {
    if (hasNext)
      navigate({
        to: `/files/${fileId}/translate/${selectedRows[pos + 1]}`,
      })
  }, [hasNext, navigate, fileId, selectedRows, pos])

  const save = useCallback(() => {
    if (!hasUnsavedChanges || saveMutation.isPending) return
    saveMutation.mutate()
  }, [hasUnsavedChanges, saveMutation])

  const saveAndNext = useCallback(async () => {
    if (!hasNext || saveMutation.isPending) return
    await saveMutation.mutateAsync()
    goNext()
  }, [hasNext, saveMutation, goNext])

  useHotkeys(
      shortcuts.previous ? norm(shortcuts.previous) : "",
      (e) => {
        e.preventDefault()
        goPrev()
      },
      { enableOnFormTags: ["INPUT", "TEXTAREA"] },
      [goPrev],
  )

  useHotkeys(
      shortcuts.skip ? norm(shortcuts.skip) : "",
      (e) => {
        e.preventDefault()
        goNext()
      },
      { enableOnFormTags: ["INPUT", "TEXTAREA"] },
      [goNext],
  )

  useHotkeys(
      shortcuts.accept ? norm(shortcuts.accept) : "",
      (e) => {
        e.preventDefault()
        save()
      },
      { enableOnFormTags: ["INPUT", "TEXTAREA"] },
      [save],
  )

  useHotkeys(
      shortcuts.accept_and_next ? norm(shortcuts.accept_and_next) : "",
      (e) => {
        e.preventDefault()
        saveAndNext()
      },
      { enableOnFormTags: ["INPUT", "TEXTAREA"] },
      [saveAndNext],
  )

  if (rowLoading) {
    return (
        <Container centerContent py={16}>
          <Spinner size="xl" />
        </Container>
    )
  }
  if (rowError || !rowData) {
    return (
        <Container py={8}>
          <Text color="red.500">Error loading row {actualIndex}.</Text>
        </Container>
    )
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
                            const v = e.target.value
                            setCols((prev) =>
                                prev.map((col, i) =>
                                    i === idx ? { ...col, translation: v } : col,
                                ),
                            )
                          }}
                      />
                    </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

      <Flex gap={4} justify={"center"}>
        <Button onClick={goPrev} disabled={!hasPrev} py="8">
          <Stack >
            Previous Row
            <ShortcutChips combo={shortcuts.previous} />
          </Stack>
        </Button>

        <Button
          colorScheme="blue"
          onClick={() => saveMutation.mutate()}
          disabled={!hasUnsavedChanges || saveMutation.isPending}
          py="8"
        >
          <Stack>
            {saveMutation.isPending ? "Saving…" : "Apply Changes"}
            <ShortcutChips combo={shortcuts.accept} />
          </Stack>
        </Button>

        <Button
          onClick={saveAndNext}
          disabled={!hasNext || saveMutation.isPending}
          py="8"
        >
          <Stack>
            Apply and Next Row
            <ShortcutChips combo={shortcuts.accept_and_next} />
          </Stack>
        </Button>

        <Button onClick={goNext} disabled={!hasNext} py="8">
          <Stack>
            Next Row
            <ShortcutChips combo={shortcuts.skip} />
          </Stack>
        </Button>
      </Flex>
    </Container>
  );
}
