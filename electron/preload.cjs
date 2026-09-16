// The only bridge between the web app and the desktop shell. Everything else stays sandboxed.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('loopster', {
  desktop: true,
  library: {
    pick: (dialogTitle) => ipcRenderer.invoke('library:pick', dialogTitle),
    restore: () => ipcRenderer.invoke('library:restore'),
    refresh: () => ipcRenderer.invoke('library:refresh'),
    forget: () => ipcRenderer.invoke('library:forget'),
    read: (filePath) => ipcRenderer.invoke('library:read', filePath),
  },
  file: {
    /** The file the app was started with (double-clicked in Explorer), once. */
    pending: () => ipcRenderer.invoke('file:pending'),
    /** Files double-clicked while the app is already running. */
    onOpen: (listener) => {
      const handler = (_event, file) => listener(file)
      ipcRenderer.on('file:open', handler)
      return () => ipcRenderer.removeListener('file:open', handler)
    },
  },
  recordings: {
    folder: () => ipcRenderer.invoke('recordings:folder'),
    list: (songId) => ipcRenderer.invoke('recordings:list', songId),
    save: (take) => ipcRenderer.invoke('recordings:save', take),
    read: (filePath) => ipcRenderer.invoke('recordings:read', filePath),
    remove: (filePath, metaPath) => ipcRenderer.invoke('recordings:delete', filePath, metaPath),
    reveal: (filePath) => ipcRenderer.invoke('recordings:reveal', filePath),
  },
})
