import { Platform } from 'react-native';
import { buildPdfHtml, type PdfReportOptions } from './pdfReport';
import { BPReading } from '../src/schemas';

export async function sharePdfReport(
  readings: BPReading[],
  options: PdfReportOptions = {}
): Promise<void> {
  const html = buildPdfHtml(readings, options);

  if (Platform.OS === 'web') {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const popup = window.open(url, '_blank');
    if (!popup) {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `bp-tracker-report-${new Date().toISOString().slice(0, 10)}.html`;
      anchor.click();
    }
    return;
  }

  const Print = await import('expo-print');
  const Sharing = await import('expo-sharing');
  const result = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share BP report',
    });
    return;
  }
  throw new Error('Sharing is not available on this device');
}
