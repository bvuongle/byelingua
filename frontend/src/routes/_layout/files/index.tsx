import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Table,
  FileUpload,
  Text,
} from "@chakra-ui/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { format } from "date-fns"

import useCustomToast from "@/hooks/useCustomToast";
import {LuEye, LuSend, LuTrash, LuUpload} from "react-icons/lu";
import {FilesService} from "@/client";
import useAuth from "@/hooks/useAuth.ts";
import DownloadButton from "@/components/Files/download-button.tsx";

const MAX_FILES_ALLOWED = 5
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

const getFiles = async () => FilesService.listFiles();

const uploadFile = async ({ file }: { file: File }) => FilesService.uploadFile({formData: {file}});

export const Route = createFileRoute("/_layout/files/")({ component: FilesPage });

function FilesTable() {
  const toast = useCustomToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: "/_layout/files" });
  const { data: files = [], isError } = useQuery({
    queryKey: ["files"],
    queryFn: getFiles,
  });

  const deleteFileMutation = useMutation({
    mutationFn: (fileId: string) => FilesService.deleteFile({ fileId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      toast.showSuccessToast("File deleted successfully");
    },
    onError: () => {
      toast.showErrorToast("Failed to delete file");
    },
  });

  if (isError) {
    return <Text color="red.500">Failed to load files.</Text>;
  }


  return (
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>Filename</Table.ColumnHeader>
          <Table.ColumnHeader>Uploaded At</Table.ColumnHeader>
          <Table.ColumnHeader>Last Updated</Table.ColumnHeader>
          <Table.ColumnHeader style={{ width: "1%", whiteSpace: "nowrap", textAlign: "center" }}>Actions</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {files.map((file) => (
          <Table.Row key={file.id} cursor="pointer">
            <Table.Cell>{file.filename}</Table.Cell>
            <Table.Cell>
              {file.created_at ? format(new Date(file.created_at), "PPpp") : "N/A"}
            </Table.Cell>
            <Table.Cell>
              {file.last_modified ? format(new Date(file.last_modified), "PPpp") : "N/A"}
            </Table.Cell>
            <Table.Cell>
              <Flex gap="2" justify="center">
                <DownloadButton fileId={file.id} filename={file.filename} />
                <Button
                  size="xs"
                  onClick={() => navigate({ to: `/files/${file.id}` })}
                >
                  <LuEye /> Preview
                </Button>
                <Button
                  size="xs"
                  colorPalette="red"
                  onClick={() => deleteFileMutation.mutate(file.id)}
                  loading={deleteFileMutation.isPending}
                >
                  <LuTrash /> Delete
                </Button>
              </Flex>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}

export default function FilesPage() {
  const toast = useCustomToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const mutation = useMutation({
    mutationFn: uploadFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      toast.showSuccessToast("File uploaded successfully");
    },
    onError: () => {
      toast.showErrorToast("Upload failed");
    },
  });

  const handleUpload = () => {
    if (selectedFiles.length === 0) return;
    selectedFiles.forEach((file) => mutation.mutate({ file }));
    setSelectedFiles([]);
  };

  return (
    <Container maxW="full">
      <Heading size="lg" py={8}>
        <Text fontSize="2xl" truncate maxW="sm">
          Hi, {currentUser?.full_name || currentUser?.email} 👋🏼
        </Text>
        <Text>Welcome back, nice to see you again!</Text>
      </Heading>

      <FileUpload.Root
        width="100%"
        alignItems="stretch"
        accept={[
          "text/csv",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ]}
        maxFiles={MAX_FILES_ALLOWED}
        maxFileSize={MAX_FILE_SIZE}
        onFileAccept={(details) => {setSelectedFiles(details.files)}}
      >
        <FileUpload.HiddenInput />
        <FileUpload.Dropzone minHeight="10rem">
          <FileUpload.DropzoneContent>
            <LuUpload/>
            <Box>Drag and drop files here</Box>
            <Box color="fg.muted">.xlsx, .xls, .csv</Box>
            <Box color="fg.muted">Maximum file size: 10MB</Box>
          </FileUpload.DropzoneContent>
        </FileUpload.Dropzone>
        <FileUpload.List showSize clearable files={selectedFiles}/>
      </FileUpload.Root>

      <Flex justify="flex-end" py={4}>
        <Button colorScheme="blue" onClick={handleUpload}>
          <LuSend />Submit
        </Button>
      </Flex>

      <Box>
        <FilesTable />
      </Box>
    </Container>
  )
}
