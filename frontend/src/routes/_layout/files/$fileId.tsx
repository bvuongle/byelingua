import { useState, useEffect } from "react";
import {
  Box,
  Container,
  Heading,
  Table,
  Button,
  Flex,
  Spinner,
  Text,
} from "@chakra-ui/react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  TextField,
  ListItemText,
} from "@mui/material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FilesService, Language, UtilsService, FilesGetFilePreviewResponse } from "@/client";
import useCustomToast from "@/hooks/useCustomToast";
import { getLanguageName } from "@/utils/language.ts";

const getAvailableLanguage = async () => UtilsService.availableLanguages();
const getFilePreview = async (fileId: string) => {
  return FilesService.getFilePreview({fileId})
}

function parseRangeString(rangeStr: string, max: number): Set<number> {
  const result = new Set<number>();
  if (!rangeStr.trim()) {
    for (let i = 1; i <= max; i++) result.add(i);
    return result;
  }
  for (const part of rangeStr.split(",").map((p) => p.trim())) {
    if (!part) continue;
    const [start, end] = part.split("-").map((s) => parseInt(s.trim(), 10));
    if (isNaN(start)) continue;
    if (!isNaN(end)) {
      const low = Math.min(start, end);
      const high = Math.min(Math.max(start, end), max);
      for (let i = low; i <= high; i++) result.add(i);
    } else if (start >= 1 && start <= max) {
      result.add(start);
    }
  }
  return result;
}

export const Route = createFileRoute("/_layout/files/$fileId")({ component: FilePreviewPage });

function FilePreviewPage() {
  const { fileId } = Route.useParams();
  const navigate = useNavigate({ from: "/_layout/files/$fileId" });
  const toast = useCustomToast();
  const queryClient = useQueryClient();

  // fetch available langs
  const {
    data: languages = [],
    isLoading: langsLoading,
    isError: langsError,
  } = useQuery<string[]>({
    queryKey: ["avail-langs"],
    queryFn: getAvailableLanguage,
  });

  // fetch a list of files
  const {
    data: files = [],
    isLoading: filesLoading,
    isError: filesError,
  } = useQuery({
    queryKey: ["files"],
    queryFn: () => FilesService.listFiles(),
  });
  const fileMeta = files.find((f) => f.id === fileId);

  // Download preview
  const {
    data: filePreview,
    isLoading: previewLoading,
    isError: previewError,
  } = useQuery<FilesGetFilePreviewResponse>({
    queryKey: ["file-preview", fileId],
    queryFn: async () => getFilePreview(fileId),
  });

  // form state
  const [sourceLang, setSourceLang] = useState<Language | undefined>(undefined);
  const [targetLang, setTargetLang] = useState<Language | undefined>(undefined);
  const [selectedColumns, setSelectedColumns] = useState<number[]>([]);
  const [includeRows, setIncludeRows] = useState<string>("");
  const [excludeRows, setExcludeRows] = useState<string>("");

  useEffect(() => {
    if(!fileMeta) return;
    setSourceLang(fileMeta.source_language);
    setTargetLang(fileMeta.target_language);
    setSelectedColumns(fileMeta?.selected_columns || [])
  }, [fileMeta]);

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!fileMeta) throw new Error("Missing file metadata");
      const cols =
        selectedColumns.length > 0
          ? selectedColumns
          : filePreview?.headers.map((_, i) => i);
      return FilesService.updateFile({
        fileId,
        requestBody: {
          source_language: sourceLang,
          target_language: targetLang!,
          filename: fileMeta.filename,
          selected_columns: cols,
        },
      });
    },
    onSuccess: () => {
      toast.showSuccessToast("Translation session initialized");
      queryClient.invalidateQueries({ queryKey: ["files"] });

      // compute and store selected rows in React‑Query cache
      const maxRows = fileMeta?.total_rows || 0;
      const includeSet = parseRangeString(includeRows, maxRows);
      const excludeSet = excludeRows.trim()
        ? parseRangeString(excludeRows, maxRows)
        : new Set<number>();
      const rowList = Array.from(includeSet)
        .filter((i) => !excludeSet.has(i))
        .sort((a, b) => a - b);

      queryClient.setQueryData<number[]>(["selectedRows", fileId], rowList);

      if (rowList.length > 0) {
        navigate({
          to: `/files/${fileId}/translate/${rowList[0]}`,
        })
      } else {
        toast.showErrorToast("No rows selected to translate");
      }
    },
    onError: () => toast.showErrorToast("Failed to start translation"),
  });

  if (langsLoading || filesLoading || previewLoading)
    return (
      <Container centerContent py={16}>
        <Spinner size="xl" />
      </Container>
    );
  if (langsError || filesError || previewError || !fileMeta)
    return (
      <Container py={8}>
        <Text color="red.500">Error loading file.</Text>
      </Container>
    );

  const maxRows = fileMeta?.total_rows || 0;
  const includeSet = parseRangeString(includeRows, maxRows);
  const excludeSet = excludeRows.trim()
    ? parseRangeString(excludeRows, maxRows)
    : new Set<number>();
  const rowCount = [...includeSet].filter((i) => !excludeSet.has(i)).length;

  return (
    <Container maxW="full" py={4}>
      <Flex justify="space-between" mb={6} align="center">
        <Heading size="lg">Translation Preview: {fileMeta.filename}</Heading>
        <Flex gap={3}>
          <Button onClick={() => navigate({ to: "/files" })}>Go Back</Button>
          <Button
            colorScheme="blue"
            onClick={() => updateMutation.mutate()}
            disabled={!targetLang}
          >
            {updateMutation.isPending ? <Spinner size="sm" /> : "Start Translation"}
          </Button>
        </Flex>
      </Flex>

      <Box bg="bg.emphasized" p={4} borderRadius="md" mb={6}>
        <Text fontSize="sm" color="fg.muted">
          • Leave source blank for auto‑detect.
        </Text>
        <Text fontSize="sm" color="fg.muted" mt={1}>
          • Target language is required.
        </Text>
        <Text fontSize="sm" color="fg.muted" mt={1}>
          • All columns/rows are selected by default.
        </Text>
      </Box>

      {/* language & column selectors */}
      <Box mb={6}>
        <Flex gap={4} mb={4} wrap="wrap" align="flex-end">
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel id="src-lang">Source Language</InputLabel>
            <Select
              labelId="src-lang"
              value={sourceLang ?? ""}
              label="Source Language"
              onChange={(e) => setSourceLang(e.target.value as Language)}
              renderValue={(v) =>
                v ? getLanguageName(v as string) : "Auto Detect"
              }
            >
              <MenuItem value="">
                <em>Auto Detect</em>
              </MenuItem>
              {languages.map((lang) => (
                <MenuItem key={lang} value={lang}>
                  {getLanguageName(lang)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel id="tgt-lang">Target Language</InputLabel>
            <Select
              labelId="tgt-lang"
              value={targetLang ?? ""}
              label="Target Language"
              onChange={(e) => setTargetLang(e.target.value as Language)}
              renderValue={(v) => getLanguageName(v as string)}
            >
              {languages.map((lang) => (
                <MenuItem key={lang} value={lang}>
                  {getLanguageName(lang)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ flexGrow: 1 }}>
            <InputLabel id="cols-label">Select Columns</InputLabel>
            <Select
              labelId="cols-label"
              multiple
              value={selectedColumns}
              onChange={(e) =>
                setSelectedColumns(
                  (e.target.value as number[]).filter((v) => v >= 0)
                )
              }
              renderValue={(sel) =>
                (sel as number[])
                  .map((i) => filePreview?.headers[i])
                  .join(", ")
              }
              label="Select Columns"
            >
              <MenuItem value={-1}>
                <Checkbox
                  checked={selectedColumns.length === filePreview?.headers.length}
                />
                <ListItemText primary="Select All" />
              </MenuItem>
              {filePreview?.headers.map((col, idx) => (
                <MenuItem key={idx} value={idx}>
                  <Checkbox checked={selectedColumns.includes(idx)} />
                  <ListItemText primary={col} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Flex>

        {/* row range inputs */}
        <Flex gap={4} wrap="wrap" align="center">
          <TextField
            label="Include Rows"
            placeholder="e.g. 1-10,15"
            sx={{ flexGrow: 1 }}
            value={includeRows}
            onChange={(e) => setIncludeRows(e.target.value)}
          />
          <TextField
            label="Exclude Rows"
            placeholder="e.g. 5,7"
            sx={{ flexGrow: 1 }}
            value={excludeRows}
            onChange={(e) => setExcludeRows(e.target.value)}
          />
        </Flex>
        <Text fontSize="sm" color="gray.500" mt={2}>
          {rowCount} rows selected.
        </Text>
      </Box>

      {/* CSV preview */}
      <Box
        overflowX="auto"
        overflowY="auto"
        maxH="60vh"
        border="1px solid"
        borderColor="gray.200"
        borderRadius="md"
      >
        <Table.Root interactive stickyHeader>
          <Table.Header>
            <Table.Row bg="bg.subtle">
              {filePreview?.headers.map((col, i) => (
                <Table.ColumnHeader key={i}>{col}</Table.ColumnHeader>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {filePreview?.rows.map((row, r) => (
              <Table.Row key={r}>
                {row.map((cell, c) => (
                  <Table.Cell key={c}>{cell}</Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </Container>
  );
}
