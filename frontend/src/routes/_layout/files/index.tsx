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
import {LuDownload, LuEye, LuSend, LuTrash, LuUpload} from "react-icons/lu";
import {FilesService, OpenAPI} from "@/client";
import useAuth from "@/hooks/useAuth.ts";

const MAX_FILES_ALLOWED = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024

const getFiles = async () => {
  return FilesService.listFiles();
};

const uploadFile = async ({ file }: { file: File }) => {
  return FilesService.uploadFile({formData: {file}});
};

export const Route = createFileRoute("/_layout/files/")({
  component: FilesPage,
  validateSearch: () => ({}),
});

function FilesTable() {
  const toast = useCustomToast()
  const queryClient = useQueryClient()
  const navigate = useNavigate({ from: "/_layout/files" });
  const { data: files = [] } = useQuery({
    queryKey: ["files"],
    queryFn: getFiles,
  });

  const deleteFileMutation = useMutation({
    mutationFn: (fileId: string) =>
      FilesService.deleteFile({ fileId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      toast.showSuccessToast("File deleted successfully");
    },
    onError: () => {
      toast.showErrorToast("Failed to delete file");
    },
  });


  const handleDelete = (fileId: string) => {
    deleteFileMutation.mutate(fileId);
  };

  const handleDownload = async (fileId: string, filename: string) => {
    let objectURL: string | undefined;
    try {
      const response = await fetch(`${OpenAPI.BASE}/api/v1/files/${fileId}/download`, {
        method: "GET",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status} – ${text || response.statusText}`);
      }

      const blob = await response.blob();
      objectURL = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = objectURL;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      toast.showErrorToast("Failed to download file")
      console.error("Download error:", error);
    } finally {
      if (objectURL) URL.revokeObjectURL(objectURL);   // free memory
    }
  };

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
          <Table.Row key={file.id}
                     cursor="pointer"
          >
            <Table.Cell>
              {file.filename}
            </Table.Cell>
            <Table.Cell>
              {file.created_at ? format(new Date(file.created_at), "PPpp") : "N/A"}
            </Table.Cell>
            <Table.Cell>
              {file.last_modified ? format(new Date(file.last_modified), "PPpp") : "N/A"}
            </Table.Cell>
            <Table.Cell>
              <Flex gap="2" justify="center">
                <Button
                  size="xs"
                  onClick={() => handleDownload(file.id, file.filename)}
                >
                  <LuDownload /> Download
                </Button>
                <Button
                  size="xs"
                  onClick={() => navigate({ to: `/files/${file.id}` })}
                >
                  <LuEye /> Preview
                </Button>
                <Button
                  size="xs"
                  colorPalette="red"
                  onClick={() => handleDelete(file.id)}
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
  const toast = useCustomToast()
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const mutation = useMutation({
    mutationFn: uploadFile,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["files"]})
      toast.showSuccessToast("File uploaded successfully")
    },
    onError: () => {
      toast.showErrorToast("Upload failed")
    },
  })

  const handleUpload = () => {
    if (selectedFiles.length === 0) return

    selectedFiles.forEach(file => {
      mutation.mutate({ file })
    })

    setSelectedFiles([])
  }

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
