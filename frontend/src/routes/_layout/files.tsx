import {
    Box,
    Button,
    Container,
    Flex,
    Heading,
    Table,
    FileUpload,
} from "@chakra-ui/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import { format } from "date-fns"

import mockFiles from "@/mock/files.json"
import useCustomToast from "../../hooks/useCustomToast";
import {LuSend, LuUpload} from "react-icons/lu";

const MAX_FILES_ALLOWED = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024

const getFiles = async () => {
    return mockFiles
}

// @ts-ignore
const uploadFile = async ({ file }) => {
    const newFile = {
        id: Date.now(),
        filename: file.name,
        uploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }

    mockFiles.push(newFile)
    return newFile
}

export const Route = createFileRoute("/_layout/files")({
    component: FilesPage,
    validateSearch: () => ({}),
});

function FilesTable() {
    const { data: files = [] } = useQuery({
        queryKey: ["files"],
        queryFn: getFiles,
    })

    return (
        <Table.Root>
            <Table.Header>
                <Table.Row>
                    <Table.ColumnHeader>Filename</Table.ColumnHeader>
                    <Table.ColumnHeader>Uploaded At</Table.ColumnHeader>
                    <Table.ColumnHeader>Last Updated</Table.ColumnHeader>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {files.map((file) => (
                    <Table.Row key={file.id}>
                        <Table.Cell>
                            <Link
                                to="/files/$fileId"
                                params={{ fileId: file.id }}
                            >
                                {file.filename}
                            </Link>
                        </Table.Cell>
                        <Table.Cell>{format(new Date(file.uploadedAt), "PPpp")}</Table.Cell>
                        <Table.Cell>{format(new Date(file.updatedAt), "PPpp")}</Table.Cell>
                    </Table.Row>
                ))}
            </Table.Body>
        </Table.Root>
    )
}

function FilesPage() {
    const toast = useCustomToast()
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
                File Management
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

