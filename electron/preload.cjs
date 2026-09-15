// The only bridge between the web app and the desktop shell. Everything else stays sandboxed.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('loopster', {
  desktop: true,
  library: {
    pick: () => ipcRenderer.invoke('library:pick'),
    restore: () => ipcRenderer.invoke('library:restore'),
    refresh: () => ipcRenderer.invoke('library:refresh'),
    forget: () => ipcRenderer.invoke('library:forget'),
    read: (filePath) => ipcRenderer.invoke('library:read', filePath),
  },
})
