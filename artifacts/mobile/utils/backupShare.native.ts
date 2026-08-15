// @ts-nocheck — expo-file-system/legacy ships untyped shim sources in SDK 54
import * as DocumentPicker from 'expo-document-picker';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import type { EncryptedBackupFile } from './backup';

type LegacyFileSystem = {
  documentDirectory: string | null;
  writeAsStringAsync: (uri: string, contents: string, options?: { encoding?: string }) => Promise<void>;
  readAsStringAsync: (uri: string, options?: { encoding?: string }) => Promise<string>;
  EncodingType: { UTF8: string };
};

const FileSystem = require('expo-file-system/legacy') as LegacyFileSystem;

export async function shareBackupFile(backup: EncryptedBackupFile): Promise<void> {
  if (!FileSystem.documentDirectory) {
    throw new Error('Document directory is not available');
  }
  const fileName = `bp-tracker-backup-${backup.createdAt.slice(0, 10)}.json`;
  const fileUri = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backup), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (await isAvailableAsync()) {
    await shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Save encrypted backup',
    });
    return;
  }
  throw new Error('Sharing is not available on this device');
}

export async function pickBackupFile(): Promise<string> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]?.uri) {
    throw new Error('No file selected');
  }
  return FileSystem.readAsStringAsync(result.assets[0].uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}
