import JSZip from 'jszip';
import { Project } from '../types';

export const exportProjectToZip = async (project: Project): Promise<void> => {
  const zip = new JSZip();

  // Add all files
  Object.values(project.files).forEach((file) => {
    zip.file(file.path, file.content);
  });

  // Add a package.json / manifest if not present
  if (!project.files['metadata.json']) {
    zip.file(
      'metadata.json',
      JSON.stringify(
        {
          name: project.name,
          description: project.description,
          exportedBy: 'IMCH AI Developer',
          company: 'IMCH Soluções Digitais',
          entryFile: project.entryFile,
          createdAt: project.createdAt,
          exportedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const filename = `${project.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '') || 'imch-project'}.zip`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(content);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

export const exportSingleFile = (fileName: string, content: string): void => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
