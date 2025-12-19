import { contextBridge, ipcRenderer } from 'electron';

interface BusinessContext {
  industry: string;
  companySize: string;
  region: string;
  marketSize: string;
  growthRate: string;
  marketTrends: string;
  primaryKPIs: string;
  benchmarks: string;
  painPoints: string;
  techStack: string;
}

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  readOutputFile: (filename: string) => ipcRenderer.invoke('read-output-file', filename),
  listOutputFiles: (subdir: string) => ipcRenderer.invoke('list-output-files', subdir),
  readAllOutputs: () => ipcRenderer.invoke('read-all-outputs'),
  openOutputFolder: () => ipcRenderer.invoke('open-output-folder'),
  archiveOutputs: (inputImagePath: string | null) => ipcRenderer.invoke('archive-outputs', inputImagePath),
  downloadFile: (filename: string) => ipcRenderer.invoke('download-file', filename),
  downloadFolder: (subdir: string) => ipcRenderer.invoke('download-folder', subdir),
  downloadAllAsZip: () => ipcRenderer.invoke('download-all-as-zip'),
  saveBusinessContext: (context: BusinessContext) => ipcRenderer.invoke('save-business-context', context),
  regenerateFromSchema: () => ipcRenderer.invoke('regenerate-from-schema'),
  checkCachedSchema: () => ipcRenderer.invoke('check-cached-schema'),
  onPipelineProgress: (callback: (data: { stage: number; status: string; message: string }) => void) => {
    ipcRenderer.on('pipeline-progress', (_, data) => callback(data));
  },
});
