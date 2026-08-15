export async function pickTextFile(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.json,text/csv,application/json,text/plain';

    const cleanup = () => {
      window.removeEventListener('focus', onFocus);
      input.remove();
    };

    const onFocus = () => {
      window.setTimeout(() => {
        if (!input.files?.length) {
          cleanup();
          reject(new Error('No file selected'));
        }
      }, 400);
    };

    input.onchange = async () => {
      cleanup();
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      resolve(await file.text());
    };

    window.addEventListener('focus', onFocus, { once: true });
    document.body.appendChild(input);
    input.click();
  });
}
