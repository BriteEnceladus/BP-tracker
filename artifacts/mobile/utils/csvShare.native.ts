// @ts-nocheck — expo-file-system/legacy ships untyped shim sources in SDK 54
import { shareAsync, isAvailableAsync } from 'expo-sharing';

type LegacyFileSystem = {
  documentDirectory: string | null;
  writeAsStringAsync: (
    uri: string,
    contents: string,
    options?: { encoding?: string }
  ) => Promise<void>;
  EncodingType: { UTF8: string };
};

// Avoid importing expo-file-system/legacy types (SDK 54 ships broken shim .ts sources).
const FileSystem = require('expo-file-system/legacy') as LegacyFileSystem;

export async function shareCsvFile(csvContent: string, fileName: string): Promise<void> {
  if (!FileSystem.documentDirectory) {
    throw new Error('Document directory is not available');
  }

  const fileUri = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await isAvailableAsync()) {
    await shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Blood Pressure Readings',
    });
    return;
  }

  throw new Error('Sharing is not available on this device');
}
