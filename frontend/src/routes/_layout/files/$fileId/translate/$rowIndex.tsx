import {
  Container,
  Heading,
  Button,
  Flex,
  Text,
} from "@chakra-ui/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_layout/files/$fileId/translate/$rowIndex"
)({
  component: TranslateRowPage,
});
export default function TranslateRowPage() {
  const { fileId, rowIndex } = Route.useParams();
  const navigate = useNavigate({ from: "/_layout/files/$fileId" });

  // rowIndex param is the actual CSV row number
  const actualIndex = parseInt(rowIndex, 10);

  const raw = localStorage.getItem(`selectedRows_${fileId}`);
  const selectedRows: number[] = raw ? JSON.parse(raw) : [];
  const pos = selectedRows.findIndex((r) => r === actualIndex);

  const hasPrev = pos > 0;
  const hasNext = pos >= 0 && pos < selectedRows.length - 1;


  return (
    <Container maxW="full" py={4}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="md">
          Row {pos + 1} of {selectedRows.length}
        </Heading>
        <Text fontSize="sm" color="gray.600">
          (CSV row #{actualIndex})
        </Text>
      </Flex>



      <Flex gap={4}>
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
          // onClick={() => saveMutation.mutate()}
        >
          Apply Changes
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
