import { useState } from 'react';
import { Button } from '@chakra-ui/react';
import { LuDownload } from 'react-icons/lu';
import { OpenAPI } from '@/client';
import useCustomToast from '@/hooks/useCustomToast';

interface DownloadButtonProps {
	fileId: string;
	filename: string;
	size?: 'xs' | 'sm' | 'md';
}

export default function DownloadButton({
	fileId,
	filename,
	size = 'xs',
}: DownloadButtonProps) {
	const [loading, setLoading] = useState(false);
	const toast = useCustomToast();

	const handleDownload = async () => {
		let objectURL: string | undefined;
		setLoading(true);
		try {
			const response = await fetch(
				`${OpenAPI.BASE}/api/v1/files/${fileId}/download`,
				{
					method: 'GET',
					headers: {
						accept: 'application/json',
						authorization: `Bearer ${localStorage.getItem('access_token')}`,
					},
				},
			);
			if (!response.ok) {
				const text = await response.text();
				throw new Error(`${response.status} – ${text || response.statusText}`);
			}
			const blob = await response.blob();
			objectURL = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = objectURL;
			a.download = filename;
			a.style.display = 'none';
			document.body.appendChild(a);
			a.click();
			a.remove();
		} catch (error) {
			toast.showErrorToast('Failed to download file');
			console.error('Download error:', error);
		} finally {
			if (objectURL) URL.revokeObjectURL(objectURL);
			setLoading(false);
		}
	};

	return (
		<Button
			size={size}
			onClick={handleDownload}
			loading={loading}
			loadingText="Downloading..."
		>
			<LuDownload /> Download
		</Button>
	);
}
