import {
	type FilesGetFilePreviewResponse,
	type FilesGetFileResponse,
	FilesService,
	type Language,
	UtilsService,
} from '@/client';
import DownloadButton from '@/components/Files/DownloadButton.tsx';
import useCustomToast from '@/hooks/useCustomToast';
import { getLanguageName } from '@/utils/language.ts';
import { computeRows } from '@/utils/range.ts';
import {
	Box,
	Button,
	Container,
	Flex,
	Heading,
	Spinner,
	Table,
	Text,
} from '@chakra-ui/react';
import {
	Checkbox,
	FormControl,
	InputLabel,
	ListItemText,
	MenuItem,
	Select,
	TextField,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { LuArrowLeft } from 'react-icons/lu';

const getAvailableLanguage = async () => UtilsService.availableLanguages();
const getFilePreview = async (fileId: string) =>
	FilesService.getFilePreview({ fileId });

export const Route = createFileRoute('/_layout/files/$fileId/')({
	component: FilePreviewPage,
});

function FilePreviewPage() {
	const { fileId } = Route.useParams();
	const navigate = useNavigate();
	const toast = useCustomToast();

	const {
		data: languages = [],
		isLoading: langsLoading,
		isError: langsError,
	} = useQuery<string[]>({
		queryKey: ['avail-langs'],
		queryFn: getAvailableLanguage,
	});

	const {
		data: fileMeta,
		isLoading: fileLoading,
		isError: fileError,
	} = useQuery<FilesGetFileResponse>({
		queryKey: ['files', fileId],
		queryFn: () => FilesService.getFile({ fileId }),
	});

	const {
		data: filePreview,
		isLoading: previewLoading,
		isError: previewError,
	} = useQuery<FilesGetFilePreviewResponse>({
		queryKey: ['file-preview', fileId],
		queryFn: async () => getFilePreview(fileId),
	});

	const [sourceLang, setSourceLang] = useState<Language | undefined>(undefined);
	const [targetLang, setTargetLang] = useState<Language | undefined>(undefined);
	const [selectedColumns, setSelectedColumns] = useState<number[]>([]);
	const [selectedRows, setSelectedRows] = useState<number[]>([]);
	const [includeRows, setIncludeRows] = useState<string>('');
	const [excludeRows, setExcludeRows] = useState<string>('');
	const [rowInputsChanged, setRowInputsChanged] = useState(false);

	useEffect(() => {
		if (!fileMeta) return;
		setSourceLang(fileMeta.source_language);
		setTargetLang(fileMeta.target_language);
		if (selectedColumns.length === 0) {
			setSelectedColumns(fileMeta?.selected_columns || []);
		}
		if (
			!includeRows &&
			!excludeRows &&
			!rowInputsChanged &&
			fileMeta.selected_rows
		) {
			setSelectedRows(
				fileMeta.selected_rows.length > 0 ? fileMeta.selected_rows : [],
			);
			setIncludeRows(
				fileMeta.selected_rows ? fileMeta.selected_rows.join(', ') : '',
			);
		}
	}, [fileMeta]);

	const maxRows = fileMeta?.total_rows || 0;
	const computedRows = computeRows(includeRows, excludeRows, maxRows);

	const clearAll = () => {
		setSourceLang(undefined);
		setTargetLang(undefined);
		if (filePreview?.headers) {
			setSelectedColumns(filePreview.headers.map((_, i) => i));
		}
		setIncludeRows(`1-${maxRows}`);
		setExcludeRows('');
		setRowInputsChanged(true);
	};

	const handleIncludeRowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setIncludeRows(e.target.value);
		setRowInputsChanged(true);
	};

	const handleExcludeRowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setExcludeRows(e.target.value);
		setRowInputsChanged(true);
	};

	const updateMutation = useMutation({
		mutationFn: () => {
			if (!fileMeta) throw new Error('Missing file metadata');
			const cols =
				selectedColumns.length > 0
					? selectedColumns
					: filePreview?.headers.map((_, i) => i) || [];

			const rows = computeRows(includeRows, excludeRows, maxRows);
			setSelectedRows(rows);

			return FilesService.updateFile({
				fileId,
				requestBody: {
					source_language: sourceLang,
					target_language: targetLang!,
					filename: fileMeta.filename,
					selected_columns: cols,
					selected_rows: rows,
				},
			});
		},
		onSuccess: () => {
			toast.showSuccessToast('Translation session initialized');
			const rowsToTranslate = computeRows(includeRows, excludeRows, maxRows);
			const isResume =
				fileMeta?.selected_rows &&
				fileMeta.selected_rows.length > 0 &&
				!rowInputsChanged;
			let startRowIndex = rowsToTranslate[0] || 1;

			if (
				isResume &&
				fileMeta?.rows_completed !== undefined &&
				fileMeta.rows_completed !== null &&
				rowsToTranslate.includes(fileMeta.rows_completed)
			) {
				startRowIndex = fileMeta.rows_completed;
			}

			navigate({
				to: `/files/${fileId}/translate/${startRowIndex}`,
			});
		},
		onError: () =>
			toast.showErrorToast(
				'Failed to start translation. Please check your configuration.',
			),
	});

	if (langsLoading || fileLoading || previewLoading)
		return (
			<Container centerContent py={16}>
				<Spinner size='xl' />
			</Container>
		);
	if (langsError || fileError || previewError || !fileMeta)
		return (
			<Container py={8}>
				<Text color='red.500'>Error loading file.</Text>
			</Container>
		);

	const isResume =
		fileMeta?.selected_rows &&
		fileMeta.selected_rows.length > 0 &&
		!rowInputsChanged;
	const buttonText = isResume ? 'Resume Translation' : 'Start Translation';

	return updateMutation.isPending ? (
		<Container centerContent py={16}>
			<Spinner size='xl' />
		</Container>
	) : (
		<Container maxW='full' py={4}>
			<Flex justify='space-between' mb={6} align='center'>
				<Heading size='lg'>
					Translation Configuration: {fileMeta.filename}
				</Heading>
				<Flex gap={3}>
					<Button onClick={() => navigate({ to: '/files' })}>
						<LuArrowLeft /> Back
					</Button>
					<Button
						onClick={() => updateMutation.mutate()}
						disabled={!targetLang}
					>
						{updateMutation.isPending ? <Spinner size='sm' /> : buttonText}
					</Button>
				</Flex>
			</Flex>

			<Box bg='bg.emphasized' p={4} borderRadius='md' mb={6}>
				<Flex justifyContent='space-between' alignItems='center'>
					<Box>
						<Text fontSize='sm' color='fg.muted'>
							• You can choose the source language to be auto detected..
						</Text>
						<Text fontSize='sm' color='fg.muted' mt={1}>
							• Target language is required.
						</Text>
						<Text fontSize='sm' color='fg.muted' mt={1}>
							• By default all columns and rows are selected.
						</Text>
					</Box>
					<Button onClick={clearAll}>Clear All</Button>
				</Flex>
			</Box>

			{/* language & column selectors */}
			<Box mb={6}>
				<Flex gap={4} mb={4} wrap='wrap' align='flex-end'>
					<FormControl sx={{ minWidth: 120 }}>
						<InputLabel id='src-lang'>Source Language</InputLabel>
						<Select
							labelId='src-lang'
							value={sourceLang ?? ''}
							label='Source Language'
							onChange={(e) => setSourceLang(e.target.value as Language)}
							renderValue={(v) => getLanguageName(v as string)}
						>
							{languages.map((lang) => (
								<MenuItem key={lang} value={lang}>
									{getLanguageName(lang)}
								</MenuItem>
							))}
						</Select>
					</FormControl>

					<FormControl sx={{ minWidth: 120 }}>
						<InputLabel id='tgt-lang'>Target Language</InputLabel>
						<Select
							labelId='tgt-lang'
							value={targetLang ?? ''}
							label='Target Language'
							onChange={(e) => setTargetLang(e.target.value as Language)}
							renderValue={(v) => getLanguageName(v as string)}
						>
							{languages
								.filter((lang) => lang !== 'auto')
								.map((lang) => (
									<MenuItem key={lang} value={lang}>
										{getLanguageName(lang)}
									</MenuItem>
								))}
						</Select>
					</FormControl>

					<FormControl sx={{ flexGrow: 1 }}>
						<InputLabel id='cols-label'>Select Columns</InputLabel>
						<Select
							labelId='cols-label'
							multiple
							value={selectedColumns}
							onChange={(e) => {
								const value = e.target.value as number[];
								if (value.includes(-1)) {
									setSelectedColumns(
										filePreview?.headers.map((_, i) => i) || [],
									);
								} else {
									setSelectedColumns(value.filter((v) => v >= 0));
								}
							}}
							renderValue={(sel) =>
								(sel as number[]).map((i) => filePreview?.headers[i]).join(', ')
							}
							label='Select Columns'
						>
							<MenuItem value={-1}>
								<Checkbox
									checked={
										selectedColumns.length === filePreview?.headers.length
									}
								/>
								<ListItemText primary='Select All' />
							</MenuItem>
							{filePreview?.headers.map((col, idx) => (
								<MenuItem key={idx} value={idx}>
									<Checkbox checked={selectedColumns.includes(idx)} />
									<ListItemText primary={col} />
								</MenuItem>
							))}
						</Select>
					</FormControl>
				</Flex>

				<Text fontSize='md' fontWeight='bold' mt={4} mb={4}>
					{includeRows || excludeRows
						? computedRows.length === 0
							? `All ${maxRows} rows selected.`
							: `${computedRows.length} row(s) selected out of ${maxRows}`
						: fileMeta?.selected_rows && fileMeta.selected_rows.length === 0
							? `All ${maxRows} rows selected.`
							: `${selectedRows.length} row(s) selected out of ${maxRows}`}
				</Text>

				{/* row range inputs */}
				<Flex gap={4} wrap='wrap' align='center'>
					<TextField
						label='Include Rows'
						placeholder='e.g. 1-10,15'
						sx={{ flexGrow: 1 }}
						value={includeRows}
						onChange={handleIncludeRowsChange}
					/>
					<TextField
						label='Exclude Rows'
						placeholder='e.g. 5,7'
						sx={{ flexGrow: 1 }}
						value={excludeRows}
						onChange={handleExcludeRowsChange}
					/>
				</Flex>
			</Box>

			{/* CSV preview */}
			<Flex justify='space-between' align='center' mb={2}>
				<Text fontSize='md' fontWeight='bold'>
					Preview first 20 rows of "{fileMeta.filename}"
				</Text>
				<DownloadButton fileId={fileMeta.id} filename={fileMeta.filename} />
			</Flex>
			<Box
				overflowX='auto'
				overflowY='auto'
				maxH='60vh'
				border='1px solid'
				borderColor='gray.200'
				borderRadius='md'
			>
				<Table.Root interactive stickyHeader>
					<Table.Header>
						<Table.Row bg='bg.subtle'>
							{filePreview?.headers.map((col, i) => (
								<Table.ColumnHeader key={i}>{col}</Table.ColumnHeader>
							))}
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{filePreview?.rows.map((row, r) => (
							<Table.Row key={r}>
								{row.map((cell, c) => (
									<Table.Cell key={c}>{cell}</Table.Cell>
								))}
							</Table.Row>
						))}
					</Table.Body>
				</Table.Root>
			</Box>
		</Container>
	);
}
