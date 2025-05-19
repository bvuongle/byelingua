import { Flex, Button } from "@chakra-ui/react";
import { LuEye, LuTrash } from "react-icons/lu";
import DownloadButton from "./DownloadButton";
import {useNavigate} from "@tanstack/react-router";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {FilesService} from "@/client";
import useCustomToast from "@/hooks/useCustomToast.ts";

interface FileActionsProps {
  fileId: string;
  filename: string;
}

export default function FileActions({
                                      fileId,
                                      filename,
                                    }: FileActionsProps) {
  const toast = useCustomToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: "/_layout/files" });

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


  return (
    <Flex gap="2" justify="center">
      <DownloadButton fileId={fileId} filename={filename} />
      <Button
        size="xs"
        onClick={() => navigate({ to: `/files/${fileId}` })}
      >
        <LuEye /> Preview
      </Button>
      <Button
        size="xs"
        colorPalette="red"
        onClick={() => deleteFileMutation.mutate(fileId)}
        loading={deleteFileMutation.isPending}
      >
        <LuTrash /> Delete
      </Button>
    </Flex>
  );
}
