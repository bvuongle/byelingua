import { useState } from "react";
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
import Papa from "papaparse";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FilesService, Language, UtilsService } from "@/client";
import useCustomToast from "@/hooks/useCustomToast";

const getAvailableLanguage = async () => {
  return UtilsService.availableLanguages();
};

function parseRangeString(rangeStr: string, max: number): Set<number> {
  const result = new Set<number>();
  if (!rangeStr.trim()) {
    for (let i = 1; i <= max; i++) result.add(i);
    return result;
  }
  const parts = rangeStr.split(",");
  for (const part of parts.map((p) => p.trim())) {
    if (!part) continue;
    const [startStr, endStr] = part.split("-").map((s) => s.trim());
    const start = parseInt(startStr, 10);
    if (isNaN(start)) continue;
    if (endStr != null) {
      const end = parseInt(endStr, 10);
      if (isNaN(end)) {
        if (start >= 1 && start <= max) result.add(start);
      } else {
        const low = Math.min(start, end);
        const high = Math.max(start, end);
        for (let i = low; i <= high && i <= max; i++) {
          if (i >= 1) result.add(i);
        }
      }
    } else {
      if (start >= 1 && start <= max) result.add(start);
    }
  }
  return result;
}

export const Route = createFileRoute("/_layout/files/$fileId")({
  component: FilePreviewPage,
});

function FilePreviewPage() {
  const { fileId } = Route.useParams();
  const navigate = useNavigate({ from: "/_layout/files" });
  const toast = useCustomToast();
  const queryClient = useQueryClient();

  const {
    data: languages = [],
    isLoading: langsLoading,
    isError: langsError,
  } = useQuery<string[]>({
    queryKey: ["available-languages"],
    queryFn: getAvailableLanguage,
  });

  const {
    data: files = [],
    isLoading: filesLoading,
    isError: filesError,
  } = useQuery({ queryKey: ["files"], queryFn: () => FilesService.listFiles() });
  const fileMeta = files.find((f) => f.id === fileId);

  const {
    data: fileContent = [],
    isLoading: previewLoading,
    isError: previewError,
  } = useQuery<string[][]>({
    queryKey: ["file-csv", fileId],
    enabled: !!fileId,
    queryFn: async () => {
      const response = await FilesService.downloadFile({ fileId });
      const blob = new Blob([response as any]);
      const text = await blob.text();
      const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
      return parsed.data;
    },
  });

  // Form state
  const [sourceLang, setSourceLang] = useState<Language>("en");
  const [targetLang, setTargetLang] = useState<Language>("en");
  const [selectedColumns, setSelectedColumns] = useState<number[]>(() => []);
  const [includeRows, setIncludeRows] = useState<string>("");
  const [excludeRows, setExcludeRows] = useState<string>("");

  // Start translation mutation
  const updateMutation = useMutation({
    mutationFn: () => {
      if (!fileMeta) throw new Error("No file metadata");
      return FilesService.updateFile({
        fileId,
        requestBody: {
          source_language: sourceLang,
          target_language: targetLang,
          filename: fileMeta.filename,
          selected_columns: selectedColumns,
        },
      });
    },
    onSuccess: () => {
      toast.showSuccessToast("Translation started");
      queryClient.invalidateQueries({ queryKey: ["files"] });
      navigate({ to: "/files" });
    },
    onError: () => {
      toast.showErrorToast("Failed to start translation");
    },
  });

  const handleBack = () => navigate({ to: "/files" });

  if (langsLoading || filesLoading || previewLoading) {
    return (
      <Container centerContent py={16}>
        <Spinner size="xl" />
      </Container>
    );
  }
  if (langsError || filesError || previewError || !fileMeta) {
    return (
      <Container py={8}>
        <Text color="red.500">Error loading file preview or metadata.</Text>
      </Container>
    );
  }

  const maxRows = fileContent.length - 1;
  const includeSet = parseRangeString(includeRows, maxRows);
  const excludeSet = excludeRows.trim()
    ? parseRangeString(excludeRows, maxRows)
    : new Set<number>();
  const acceptedCount = [...includeSet].filter((i) => !excludeSet.has(i)).length;

  return (
    <Container maxW="full" py={4}>
      <Heading size="lg" mb={6}>
        Translation Setting. Preview of {fileMeta.filename}
      </Heading>

      {/* Controls */}
      <Box mb={6}>
        <Flex gap={4} align="flex-end" wrap="wrap" mb={4}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel id="source-lang-label">Source Language</InputLabel>
            <Select
              labelId="source-lang-label"
              value={sourceLang}
              label="Source Language"
              onChange={(e) => setSourceLang(e.target.value as Language)}
            >
              {languages.map((lang) => (
                <MenuItem key={lang} value={lang}>
                  {lang}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel id="target-lang-label">Target Language</InputLabel>
            <Select
              labelId="target-lang-label"
              value={targetLang}
              label="Target Language"
              onChange={(e) => setTargetLang(e.target.value as Language)}
            >
              {languages.map((lang) => (
                <MenuItem key={lang} value={lang}>
                  {lang}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ flexGrow: 1 }}>
            <InputLabel id="columns-label">Select Columns</InputLabel>
            <Select
              labelId="columns-label"
              multiple
              value={selectedColumns}
              onChange={(e) => {
                const value = e.target.value as number[];
                if (value.includes(-1)) {
                  setSelectedColumns(fileContent[0].map((_, i) => i));
                } else {
                  setSelectedColumns(value.filter((v) => v >= 0));
                }
              }}
              renderValue={(selected) =>
                selected.map((i) => fileContent[0][i]).join(", ")
              }
              label="Select Columns"
            >
              <MenuItem value={-1}>
                <Checkbox checked={
                  selectedColumns.length === fileContent[0].length
                } />
                <ListItemText primary="Select All" />
              </MenuItem>
              {fileContent[0].map((col, idx) => (
                <MenuItem key={idx} value={idx}>
                  <Checkbox checked={selectedColumns.includes(idx)} />
                  <ListItemText primary={col} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Flex>

        <Flex gap={4} wrap="wrap" align="center">
          <TextField
            label="Include Rows"
            placeholder="e.g. 1-10,15,20-25"
            sx={{ flexGrow: 1 }}
            value={includeRows}
            onChange={(e) => setIncludeRows(e.target.value)}
          />
          <TextField
            label="Exclude Rows"
            placeholder="e.g. 5,7,12-14"
            sx={{ flexGrow: 1 }}
            value={excludeRows}
            onChange={(e) => setExcludeRows(e.target.value)}
          />
        </Flex>

        <Text fontSize="sm" color="gray.500" mt={2}>
          {acceptedCount} rows selected.
        </Text>

        <Flex justify="flex-end" gap={3} mt={4}>
          <Button onClick={handleBack}>Go Back</Button>
          <Button
            colorScheme="blue"
            onClick={() => updateMutation.mutate()}
            loading={updateMutation.status === "loading"}
            disabled={!sourceLang || !targetLang || selectedColumns.length === 0}
          >
            Start Translation
          </Button>
        </Flex>
      </Box>

      {/* Preview Table */}
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
              {fileContent[0].map((col, idx) => (
                <Table.ColumnHeader key={idx}>{col}</Table.ColumnHeader>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {fileContent.slice(1).map((row, rIdx) => (
              <Table.Row key={rIdx}>
                {row.map((cell, cIdx) => (
                  <Table.Cell key={cIdx}>{cell}</Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </Container>
  );
}