import { Box, Flex } from "@chakra-ui/react"
import {
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material"
import { LuArrowDown, LuX } from "react-icons/lu"

interface MuiRowEditorProps {
  cols: {
    column_name: string
    original: string
    translation: string
    error_msg?: string
  }[]
  setCols: React.Dispatch<React.SetStateAction<MuiRowEditorProps["cols"]>>
}

export function MuiRowEditor({ cols, setCols }: MuiRowEditorProps) {
  const handleClear = (idx: number) => {
    setCols((prev) =>
      prev.map((col, i) => (i === idx ? { ...col, translation: "" } : col)),
    )
  }

  const handleRevertToOriginal = (idx: number) => {
    setCols((prev) =>
      prev.map((col, i) =>
        i === idx ? { ...col, translation: col.original } : col,
      ),
    )
  }

  const handleTranslationChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    idx: number,
  ) => {
    const v = e.target.value
    setCols((prev) =>
      prev.map((col, i) => (i === idx ? { ...col, translation: v } : col)),
    )
  }

  return (
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
              <TableCell
                key={c.column_name}
                sx={{
                  p: 1,
                  verticalAlign: "top",
                  backgroundColor: c.error_msg
                    ? "rgba(255, 0, 0, 0.1)"
                    : undefined,
                }}
              >
                <Flex position="relative" mb={1}>
                  <Box width="100%" textAlign="center">
                    <Tooltip title="Revert to original">
                      <IconButton onClick={() => handleRevertToOriginal(idx)}>
                        <LuArrowDown />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Box position="absolute" right="0">
                    <Tooltip title="Clear">
                      <IconButton onClick={() => handleClear(idx)}>
                        <LuX />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Flex>
                <TextField
                  value={c.translation}
                  onChange={(e) => handleTranslationChange(e, idx)}
                  multiline
                  maxRows={5}
                  minRows={5}
                  fullWidth
                />
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            {cols.map((c) => (
              <TableCell
                key={c.column_name}
                sx={{
                  p: 1,
                  verticalAlign: "top",
                  backgroundColor: c.error_msg
                    ? "rgba(255, 0, 0, 0.1)"
                    : undefined,
                }}
              >
                {c.error_msg && (
                  <Typography
                    style={{
                      color: "rgba(255, 0, 0, 2)",
                      fontSize: 15,
                      marginTop: 4,
                    }}
                  >
                    {c.error_msg}
                  </Typography>
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  )
}
