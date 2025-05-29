import { Box, Flex } from '@chakra-ui/react';
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
} from '@mui/material';
import { LuRotateCcw, LuX } from 'react-icons/lu';
import { type Language } from '@/client';

interface MuiRowEditorProps {
	cols: {
		column_name: string;
		original: string;
		translation: string;
		detected_language?: string | null;
		error_msg?: string;
	}[];
	setCols: React.Dispatch<React.SetStateAction<MuiRowEditorProps['cols']>>;
	sourceLanguage?: Language;
	hasLanguageMismatch: (detectedLang: string | null | undefined) => boolean;
}

export function MuiRowEditor({
	cols,
	setCols,
	sourceLanguage,
	hasLanguageMismatch,
}: MuiRowEditorProps) {
	const handleClear = (idx: number) => {
		setCols((prev) =>
			prev.map((col, i) => (i === idx ? { ...col, translation: '' } : col)),
		);
	};

	const handleRevertToOriginal = (idx: number) => {
		setCols((prev) =>
			prev.map((col, i) =>
				i === idx ? { ...col, translation: col.original } : col,
			),
		);
	};

	const handleTranslationChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
		idx: number,
	) => {
		const v = e.target.value;
		setCols((prev) =>
			prev.map((col, i) => (i === idx ? { ...col, translation: v } : col)),
		);
	};

	const getCellBackground = (col: MuiRowEditorProps['cols'][0]) => {
		if (hasLanguageMismatch(col.detected_language))
			return 'rgba(255, 165, 0, 0.1)';
		if (col.error_msg) return 'rgba(255, 0, 0, 0.1)';
		return undefined;
	};

	return (
		<TableContainer component={Paper} sx={{ mb: 6 }}>
			<Table>
				<TableHead>
					<TableRow>
						{cols.map((c) => (
							<TableCell
								key={c.column_name}
								sx={{
									minWidth: 200,
									maxWidth: 400,
									whiteSpace: 'nowrap',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
								}}
							>
								{c.column_name}
							</TableCell>
						))}
					</TableRow>
				</TableHead>
				<TableBody>
					<TableRow>
						{cols.map((c) => (
							<TableCell
								key={c.column_name}
								sx={{
									minWidth: 200,
									maxWidth: 400,
									whiteSpace: 'nowrap',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
								}}
							>
								{c.original}
							</TableCell>
						))}
					</TableRow>
					<TableRow>
						{cols.map((c, idx) => (
							<TableCell
								key={c.column_name}
								sx={{
									p: 1,
									verticalAlign: 'top',
									backgroundColor: getCellBackground(c),
									minWidth: 200,
									maxWidth: 400,
								}}
							>
								<Flex
									position='relative'
									mb={1}
									align='center'
									justify='flex-end'
								>
									<Box>
										{c.detected_language && (
											<Typography
												variant='caption'
												style={{
													color: 'black',
													fontSize: 14,
												}}
											>
												{c.detected_language.toUpperCase()}
											</Typography>
										)}
									</Box>
									<Flex gap={0.5} ml='auto'>
										<Tooltip title='Revert to original'>
											<IconButton onClick={() => handleRevertToOriginal(idx)}>
												<LuRotateCcw />
											</IconButton>
										</Tooltip>
										<Tooltip title='Clear'>
											<IconButton onClick={() => handleClear(idx)}>
												<LuX />
											</IconButton>
										</Tooltip>
									</Flex>
								</Flex>
								<TextField
									value={c.translation}
									onChange={(e) => handleTranslationChange(e, idx)}
									multiline
									maxRows={3}
									minRows={3}
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
									verticalAlign: 'top',
									backgroundColor: getCellBackground(c),
									minWidth: 200,
									maxWidth: 400,
								}}
							>
								{c.error_msg || hasLanguageMismatch(c.detected_language) ? (
									<Typography
										style={{
											color: hasLanguageMismatch(c.detected_language)
												? 'rgba(255, 165, 0, 2)'
												: 'rgba(255, 0, 0, 2)',
											fontSize: 15,
											marginTop: 4,
										}}
									>
										{hasLanguageMismatch(c.detected_language)
											? c.error_msg ||
												`Detected language (${c.detected_language?.toUpperCase()}) differs from source language (${sourceLanguage?.toUpperCase()})`
											: c.error_msg}
									</Typography>
								) : null}
							</TableCell>
						))}
					</TableRow>
				</TableBody>
			</Table>
		</TableContainer>
	);
}
