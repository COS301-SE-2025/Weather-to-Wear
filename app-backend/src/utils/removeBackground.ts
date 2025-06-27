import { execFile } from 'child_process';
import { resolve } from 'path';

export const removeBackground = (inputPath: string, outputPath: string): Promise<void> => {
  return new Promise((resolvePromise, rejectPromise) => {
    const scriptPath = resolve(__dirname, '../../scripts/background-removal/remove_bg.py');

    execFile('python3', [scriptPath, inputPath, outputPath], (error, stdout, stderr) => {
      if (error) {
        console.error('Error during background removal:', stderr);
        return rejectPromise(error);
      }
      console.log('Background removal completed:', stdout);
      resolvePromise();
    });
  });
};
