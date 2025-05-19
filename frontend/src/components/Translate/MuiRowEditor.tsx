import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
} from "@mui/material";
import { Input } from "@chakra-ui/react";

interface MuiRowEditorProps {
  cols: { column_name: string; original: string; translation: string }[];
  setCols: React.Dispatch<React.SetStateAction<MuiRowEditorProps["cols"]>>;
}

export function MuiRowEditor({ cols, setCols }: MuiRowEditorProps) {
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
              <TableCell key={c.column_name} sx={{ p: 1 }}>
                <Input
                  value={c.translation}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCols((prev) =>
                      prev.map((col, i) =>
                        i === idx ? { ...col, translation: v } : col
                      )
                    );
                  }}
                />
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
