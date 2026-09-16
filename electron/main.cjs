// Electron shell for Loopster. The renderer is the very same web app; this process only adds
// what a browser cannot do: a window, microphone permission and access to a folder of tab files.
const { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } = require('electron')
const path = require('node:path')
const fs = require('node:fs/promises')
const { pathToFileURL } = require('node:url')

const DIST = path.join(__dirname, '..', 'dist')
// `npm run desktop:dev` passes --dev so the window shows the Vite dev server with hot reload.
const DEV_SERVER = process.argv.includes('--dev')
  ? process.env.LOOPSTER_DEV_SERVER || 'http://localhost:5173'
  : process.env.LOOPSTER_DEV_SERVER || null
const APP_ORIGIN = 'app://loopster'
const SUPPORTED = new Set(['.gp', '.gp3', '.gp4', '.gp5', '.gpx'])
// Sent with every page response. Set here rather than as a meta tag so the Vite dev server,
// whose hot reload needs inline scripts, is not affected. 'wasm-unsafe-eval' is for alphaTab's
// audio worklet; blob: covers the recorder's takes and the worker bundles.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval' blob:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ')
const MAX_DEPTH = 5
const MAX_FILES = 2000
const SKIPPED_DIRS = new Set(['node_modules', '.git', '.svn', 'System Volume Information', '$RECYCLE.BIN'])

/** The folder the user picked; only files under it may be read. */
let libraryRoot = null
/** A file the user opened from Explorer before the window was ready to receive it. */
let pendingFile = null

/** The tab file in a command line, as Windows passes it when a .gp5 is double-clicked. */
function fileFromArgv(argv) {
  for (const arg of argv.slice(1)) {
    if (arg.startsWith('-') || arg === '.') continue
    if (SUPPORTED.has(path.extname(arg).toLowerCase())) return path.resolve(arg)
  }
  return null
}

async function readTab(filePath) {
  const data = await fs.readFile(filePath)
  return { name: path.basename(filePath), path: filePath, data: new Uint8Array(data) }
}

/** Hands a double-clicked file to the window, or keeps it until the window asks for it. */
async function deliverFile(window, filePath) {
  try {
    const file = await readTab(filePath)
    if (window && !window.isDestroyed()) {
      window.webContents.send('file:open', file)
      if (window.isMinimized()) window.restore()
      window.focus()
    } else {
      pendingFile = filePath
    }
  } catch {
    pendingFile = null
  }
}

const stateFile = () => path.join(app.getPath('userData'), 'library.json')

async function readState() {
  try {
    return JSON.parse(await fs.readFile(stateFile(), 'utf8'))
  } catch {
    return null
  }
}

async function writeState(root) {
  try {
    await fs.writeFile(stateFile(), JSON.stringify({ root }), 'utf8')
  } catch {
    // The folder is still usable this session; it just will not be remembered.
  }
}

/** Walks the folder for tab files, keeping the relative folder so the list can be grouped. */
async function scan(root) {
  const items = []
  const walk = async (dir, depth) => {
    if (depth > MAX_DEPTH || items.length >= MAX_FILES) return
    let entries
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (items.length >= MAX_FILES) return
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || SKIPPED_DIRS.has(entry.name)) continue
        await walk(full, depth + 1)
      } else if (entry.isFile() && SUPPORTED.has(path.extname(entry.name).toLowerCase())) {
        let size = 0
        let modifiedAt = 0
        try {
          const stat = await fs.stat(full)
          size = stat.size
          modifiedAt = stat.mtimeMs
        } catch {
          continue
        }
        items.push({ path: full, name: entry.name, folder: path.relative(root, dir).split(path.sep).join('/'), size, modifiedAt })
      }
    }
  }
  await walk(root, 0)
  items.sort((a, b) => a.folder.localeCompare(b.folder, 'tr') || a.name.localeCompare(b.name, 'tr'))
  return { root, items, truncated: items.length >= MAX_FILES }
}

async function openLibrary(root) {
  libraryRoot = root
  await writeState(root)
  return scan(root)
}

/**
 * Takes are normal files in Documents, so they can be kept and backed up. The folder keeps its name once
 * it exists, whatever language the app is switched to later; a first recording names it after the
 * system language.
 */
const RECORDINGS_FOLDERS = { tr: 'Loopster Kayıtları', en: 'Loopster Recordings' }

async function recordingsFolder() {
  const documents = app.getPath('documents')
  for (const name of Object.values(RECORDINGS_FOLDERS)) {
    const dir = path.join(documents, name)
    try {
      if ((await fs.stat(dir)).isDirectory()) return dir
    } catch {
      // Not there; try the next name.
    }
  }
  const name = app.getLocale().toLowerCase().startsWith('tr') ? RECORDINGS_FOLDERS.tr : RECORDINGS_FOLDERS.en
  const dir = path.join(documents, name)
  await fs.mkdir(dir, { recursive: true })
  return dir
}

function slug(text) {
  return (text || '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 40)
}

function extensionFor(mimeType) {
  if ((mimeType || '').includes('ogg')) return '.ogg'
  if ((mimeType || '').includes('mp4')) return '.m4a'
  return '.webm'
}

function timestamp(ms) {
  const d = new Date(ms)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`
}

/** Keeps a stale path from reaching anything outside the recordings folder. */
async function insideRecordings(filePath) {
  const dir = path.resolve(await recordingsFolder())
  const full = path.resolve(filePath)
  if (!full.startsWith(dir + path.sep)) throw new Error('File is outside the recordings folder.')
  return full
}

function registerRecordingIpc() {
  ipcMain.handle('recordings:folder', () => recordingsFolder())

  ipcMain.handle('recordings:list', async (_event, songId) => {
    const dir = await recordingsFolder()
    const names = await fs.readdir(dir)
    const takes = []
    for (const name of names) {
      if (!name.endsWith('.json')) continue
      try {
        const meta = JSON.parse(await fs.readFile(path.join(dir, name), 'utf8'))
        if (songId && meta.songId !== songId) continue
        const audioPath = path.join(dir, meta.audio)
        const stat = await fs.stat(audioPath)
        takes.push({ ...meta, path: audioPath, metaPath: path.join(dir, name), size: stat.size })
      } catch {
        // A half-written or hand-edited sidecar is skipped rather than breaking the list.
      }
    }
    return takes.sort((a, b) => b.createdAt - a.createdAt)
  })

  ipcMain.handle('recordings:save', async (_event, take) => {
    const dir = await recordingsFolder()
    const extension = extensionFor(take.mimeType)
    const base = `${slug(take.title) || 'loopster'}-${timestamp(take.createdAt)}`
    let name = base
    for (let i = 2; ; i += 1) {
      try {
        await fs.access(path.join(dir, `${name}${extension}`))
        name = `${base}-${i}`
      } catch {
        break
      }
    }
    const audio = `${name}${extension}`
    await fs.writeFile(path.join(dir, audio), Buffer.from(take.data))
    const meta = { ...take, audio, data: undefined }
    delete meta.data
    await fs.writeFile(path.join(dir, `${name}.json`), JSON.stringify(meta, null, 2), 'utf8')
    return { ...meta, path: path.join(dir, audio), metaPath: path.join(dir, `${name}.json`) }
  })

  ipcMain.handle('recordings:read', async (_event, filePath) => {
    const full = await insideRecordings(filePath)
    return new Uint8Array(await fs.readFile(full))
  })

  // Deleted takes go to the recycle bin, so a mis-click is recoverable.
  ipcMain.handle('recordings:delete', async (_event, filePath, metaPath) => {
    const audio = await insideRecordings(filePath)
    await shell.trashItem(audio)
    if (metaPath) {
      try {
        await shell.trashItem(await insideRecordings(metaPath))
      } catch {
        // The audio is gone; a leftover sidecar is only skipped in the listing.
      }
    }
    return true
  })

  ipcMain.handle('recordings:reveal', async (_event, filePath) => {
    shell.showItemInFolder(await insideRecordings(filePath))
    return true
  })
}

function registerIpc(getWindow) {
  registerRecordingIpc()

  // The renderer asks once on start-up: a file the app was launched with, if any.
  ipcMain.handle('file:pending', async () => {
    const filePath = pendingFile
    pendingFile = null
    if (!filePath) return null
    try {
      return await readTab(filePath)
    } catch {
      return null
    }
  })

  // The window passes the dialog title in its own language.
  ipcMain.handle('library:pick', async (_event, dialogTitle) => {
    const result = await dialog.showOpenDialog(getWindow(), {
      title: typeof dialogTitle === 'string' && dialogTitle ? dialogTitle : 'Loopster',
      properties: ['openDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return openLibrary(result.filePaths[0])
  })

  // Reopens the folder from the last session, unless it has been moved or deleted.
  ipcMain.handle('library:restore', async () => {
    const state = await readState()
    if (!state?.root) return null
    try {
      const stat = await fs.stat(state.root)
      if (!stat.isDirectory()) return null
    } catch {
      return null
    }
    libraryRoot = state.root
    return scan(state.root)
  })

  ipcMain.handle('library:refresh', async () => (libraryRoot ? scan(libraryRoot) : null))

  ipcMain.handle('library:forget', async () => {
    libraryRoot = null
    await writeState(null)
    return true
  })

  ipcMain.handle('library:read', async (_event, filePath) => {
    if (typeof filePath !== 'string' || !libraryRoot) throw new Error('No library folder is open.')
    const full = path.resolve(filePath)
    const root = path.resolve(libraryRoot)
    // Only files inside the folder the user picked, so a stale path cannot read anything else.
    if (full !== root && !full.startsWith(root + path.sep)) throw new Error('File is outside the library folder.')
    if (!SUPPORTED.has(path.extname(full).toLowerCase())) throw new Error('Unsupported file type.')
    const data = await fs.readFile(full)
    return { name: path.basename(full), data: new Uint8Array(data) }
  })
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
])

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#17150f',
    autoHideMenuBar: true,
    show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), sandbox: true },
  })

  // The microphone is the recording feature; everything else stays denied.
  const allowed = new Set(['media', 'audioCapture'])
  win.webContents.session.setPermissionRequestHandler((_wc, permission, callback) => callback(allowed.has(permission)))
  win.webContents.session.setPermissionCheckHandler((_wc, permission) => allowed.has(permission))

  // Links to alphaTab or the repository open in the real browser, never inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(APP_ORIGIN) && url !== DEV_SERVER) {
      event.preventDefault()
      if (url.startsWith('https://')) void shell.openExternal(url)
    }
  })

  // LOOPSTER_LOG_RENDERER=1 prints the page's console and load failures to the terminal.
  if (process.env.LOOPSTER_LOG_RENDERER) {
    win.webContents.on('console-message', (event) => {
      console.log(`[renderer:${event.level}] ${event.message}`)
    })
    win.webContents.on('did-fail-load', (_event, code, description, url) => {
      console.error(`[renderer] load failed ${code} ${description} ${url}`)
    })
  }

  win.once('ready-to-show', () => win.show())
  void win.loadURL(DEV_SERVER || `${APP_ORIGIN}/index.html`)
  return win
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  let mainWindow = null

  app.whenReady().then(() => {
    protocol.handle('app', async (request) => {
      const url = new URL(request.url)
      const relative = decodeURIComponent(url.pathname) === '/' ? '/index.html' : decodeURIComponent(url.pathname)
      const filePath = path.normalize(path.join(DIST, relative))
      if (!filePath.startsWith(DIST)) return new Response('Forbidden', { status: 403 })
      try {
        const response = await net.fetch(pathToFileURL(filePath).toString())
        const headers = new Headers(response.headers)
        headers.set('Content-Security-Policy', CSP)
        return new Response(response.body, { status: response.status, headers })
      } catch {
        return new Response('Not found', { status: 404 })
      }
    })

    pendingFile = fileFromArgv(process.argv)
    registerIpc(() => mainWindow)
    mainWindow = createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow()
    })
  })

  // Double-clicking another file while Loopster runs opens it in the window that is already there.
  app.on('second-instance', (_event, argv) => {
    const filePath = fileFromArgv(argv)
    if (filePath) void deliverFile(mainWindow, filePath)
    else if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  // macOS delivers the double-clicked file as an event instead of an argument.
  app.on('open-file', (event, filePath) => {
    event.preventDefault()
    if (mainWindow) void deliverFile(mainWindow, filePath)
    else pendingFile = filePath
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
