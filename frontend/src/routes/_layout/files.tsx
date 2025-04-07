import {
    Box,
    Button,
    Container,
    Flex,
    Heading,
    Table,
    Input,
} from "@chakra-ui/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { format } from "date-fns"

import mockFiles from "@/mock/files.json"
import useCustomToast from "../../hooks/useCustomToast";

const PER_PAGE = 10


const getFiles = async () => {
    // Fetch from mock data
    return mockFiles
}

const uploadFile = async ({ file }) => {
    // Mock uploading by adding the file to mockFiles.json (handled on frontend for now)
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
    const [selectedFile, setSelectedFile] = useState(null)

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
        if (!selectedFile) return

        mutation.mutate({ file: selectedFile })
    }

    return (
        <Container maxW="full">
            <Heading size="lg" py={8}>
                File Management
            </Heading>

            <Flex gap={4} align="center" pb={4}>
                <Input
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                />
                <Button colorScheme="blue" onClick={handleUpload}>
                    Upload
                </Button>
            </Flex>

            <Box>
                <FilesTable />
            </Box>
        </Container>
    )
}

