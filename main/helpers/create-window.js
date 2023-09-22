import { screen, BrowserWindow, ipcMain } from 'electron'
import Store from 'electron-store'
const path = require('path');
const sqlite3 = require('sqlite3');


// Create or open the SQLite database connection in the main process
const db = new sqlite3.Database('real.db'); // or specify a file path for a persistent database



export const createWindow = (windowName, options) => {
  const key = 'window-state'
  const name = `window-state-${windowName}`
  const store = new Store({ name })
  const defaultSize = {
    width: options.width,
    height: options.height,
  }
  let state = {}

  const restore = () => store.get(key, defaultSize)

  const getCurrentPosition = () => {
    const position = win.getPosition()
    const size = win.getSize()
    return {
      x: position[0],
      y: position[1],
      width: size[0],
      height: size[1],
    }
  }

  const windowWithinBounds = (windowState, bounds) => {
    return (
      windowState.x >= bounds.x &&
      windowState.y >= bounds.y &&
      windowState.x + windowState.width <= bounds.x + bounds.width &&
      windowState.y + windowState.height <= bounds.y + bounds.height
    )
  }

  const resetToDefaults = () => {
    const bounds = screen.getPrimaryDisplay().bounds
    return Object.assign({}, defaultSize, {
      x: (bounds.width - defaultSize.width) / 2,
      y: (bounds.height - defaultSize.height) / 2,
    })
  }

  const ensureVisibleOnSomeDisplay = (windowState) => {
    const visible = screen.getAllDisplays().some((display) => {
      return windowWithinBounds(windowState, display.bounds)
    })
    if (!visible) {
      // Window is partially or fully not visible now.
      // Reset it to safe defaults.
      return resetToDefaults()
    }
    return windowState
  }

  const saveState = () => {
    if (!win.isMinimized() && !win.isMaximized()) {
      Object.assign(state, getCurrentPosition())
    }
    store.set(key, state)
  }

  state = ensureVisibleOnSomeDisplay(restore())

  const win = new BrowserWindow({
    ...state,
    ...options,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      ...options.webPreferences,

    },
  })


  ipcMain.handle('get-currencies', async (event) => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM currency', [], (err, rows) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  });

  ipcMain.handle('add-currencies', async (event, data) => {
    const { name, value } = data;
    db.run('INSERT INTO currency (name, value) VALUES (?, ?)', [name, value], (err) => {
      if (err) {
        console.error(err);
        event.reply('currency-added', { success: false, error: err.message });
      } else {
        console.log('Currency added successfully');

      }
    });
  });
  

  win.on('close', saveState)

  return win
}
