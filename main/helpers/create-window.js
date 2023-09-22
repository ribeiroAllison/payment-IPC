import { screen, BrowserWindow, ipcMain, app } from 'electron'
import Store from 'electron-store'
const { Client, Pool } = require('pg')


const adminClient = new Client({
  user: 'postgres',      // Replace with your PostgreSQL username
  host: 'localhost',     // Replace with your PostgreSQL host
  password: 'postgres',  // Replace with your PostgreSQL password
  port: 5432,            // PostgreSQL default port
});

adminClient.connect()
  .then(() => {
    console.log('Connected to PostgreSQL server');
    
    // Define the name of the new database you want to create
    const dbName = 'real'; // Replace with your desired database name
    
    // Create the new database
    adminClient.query(`CREATE DATABASE ${dbName}`)
      .then(() => {
        console.log(`Database '${dbName}' created successfully`);
      })
      .catch((err) => {
        console.error('Error creating database:', err);
      })
      .finally(() => {
        // Disconnect from the 'postgres' database
        adminClient.end();
      });
  })
  .catch((err) => {
    console.error('Error connecting to PostgreSQL:', err);
  });


const pool = new Pool({
 user: 'postgres',
 host: 'localhost',
 database: 'real',
 password: 'postgres',
 port: 5432,
})

const createTableQuery = `
  CREATE TABLE IF NOT EXISTS currency (
    id serial PRIMARY KEY,
    name VARCHAR(255),
    value FLOAT
  );`;

const createTables = async () => {
  const client = await pool.connect();
  try{
    await client.query(createTableQuery);

    console.log('tables criated susccessfully');

  } catch(error){
    console.error(error);

  } finally {
    client.release();
  }
}

createTables();



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
    const client = await pool.connect();
    try {
      
      const result = await client.query('SELECT * FROM currency');
  
      // Return the result rows as an array
      return result.rows;
    } catch (error) {
      console.error(error);
    } finally {
      client.release(); // Release the client back to the pool when done
    }
  });
  
  ipcMain.handle('add-currencies', async (event, data) => {
    const { name, value } = data;
    const client = await pool.connect();
    try {
      
      const result = await client.query('INSERT INTO currency (name, value) VALUES ($1, $2)', [name, value]);
  
      // Check if the insertion was successful
      if (result.rowCount === 1) {
        console.log('Currency added successfully');
      } else {
        console.error('Failed to add currency');
      }
    } catch (error) {
      console.error(error);
    } finally {
      client.release(); // Release the client back to the pool when done
    }
  });
  

  win.on('close', saveState)

  return win
}
