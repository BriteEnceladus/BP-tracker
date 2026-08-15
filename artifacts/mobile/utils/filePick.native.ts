// @ts-nocheck — expo-file-system/legacy ships untyped shim sources in SDK 54
import * as DocumentPicker from 'expo-document-picker';

type LegacyFileSystem = {
  readAsStringAsync: (uri: string, options?: { encoding?: string }) => Promise<string>;
  EncodingType: { UTF8: string };
};

// SDK 54 ships broken legacy type shims; keep this require local.
const FileSystem = require('expo-file-system/legacy') as LegacyFileSystem;

export async function pickTextFile(): Promise<string> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'text/csv',
      'text/comma-separated-values',
      'text/plain',
      'application/json',
      'application/octet-stream',
      '*/*',
    ],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    throw new Error('No file selected');
  }

  return FileSystem.readAsStringAsync(result.assets[0].uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}
