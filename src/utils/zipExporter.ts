import JSZip from 'jszip';

export async function downloadFilesAsZip(
  files: Record<string, string>,
  zipFilename: string = 'website-imch.zip'
): Promise<void> {
  const zip = new JSZip();

  Object.entries(files).forEach(([path, content]) => {
    // Sanitize path
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    zip.file(cleanPath, content);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
