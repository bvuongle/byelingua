import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Typography, TextField,
  IconButton,
  InputAdornment
} from "@mui/material";
import {LuX} from "react-icons/lu";

interface MuiRowEditorProps {
  cols: { column_name: string; original: string; translation: string; error_msg?: string }[];
  setCols: React.Dispatch<React.SetStateAction<MuiRowEditorProps["cols"]>>;
}

export function MuiRowEditor({ cols, setCols }: MuiRowEditorProps) {
  const handleClear = (idx: number) => {
    setCols((prev) =>
      prev.map((col, i) =>
        i === idx ? { ...col, translation: "" } : col
      )
    );
  };
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
                  backgroundColor: c.error_msg ? "rgba(255, 0, 0, 0.1)" : undefined,
                }}
              >
                <TextField
                  value={c.translation}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCols((prev) =>
                      prev.map((col, i) =>
                        i === idx ? { ...col, translation: v } : col
                      )
                    );
                  }}
                  multiline
                  maxRows={4}
                  fullWidth
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => handleClear(idx)}>
                            <LuX />
                          </IconButton>
                        </InputAdornment>
                      )
                    },
                  }}
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
                  backgroundColor: c.error_msg ? "rgba(255, 0, 0, 0.1)" : undefined,
                }}
              >
                {c.error_msg && (
                  <Typography
                    style={{
                      color: "rgb(255, 0, 0)",
                      fontSize: 12,
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
  );
}
