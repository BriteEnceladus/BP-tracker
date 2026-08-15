import type { EncryptedBackupFile } from './backup';
import { pickTextFile } from './filePick';

export async function shareBackupFile(backup: EncryptedBackupFile): Promise<void> {
  const fileName = `bp-tracker-backup-${backup.createdAt.slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function pickBackupFile(): Promise<string> {
  return pickTextFile();
}
