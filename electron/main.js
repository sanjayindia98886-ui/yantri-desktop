const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');

let mainWindow;
let serverProcess;

function startBackendServer() {
  const serverPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app', 'server', 'server.js')
    : path.join(__dirname, '..', 'server', 'server.js');

  const fallbackServerPath = path.join(process.resourcesPath, 'server', 'server.js');
  const finalServerPath = fs.existsSync(serverPath) ? serverPath : fallbackServerPath;

  console.log('Attempting to start server from:', finalServerPath);

  if (fs.existsSync(finalServerPath)) {
    serverProcess = fork(finalServerPath, [], {
      env: { 
        ...process.env, 
        PORT: 5000,
        ELECTRON_RUN_AS_NODE: '1'
      },
      silent: true
    });

    serverProcess.stdout.on('data', (data) => {
      console.log(`[Server Log]: ${data}`);
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[Server Error]: ${data}`);
    });

    serverProcess.on('error', (err) => {
      console.error('Express Server Start Error:', err);
    });

    serverProcess.on('exit', (code, signal) => {
      console.log(`Express Server exited with code ${code} and signal ${signal}`);
    });
  } else {
    console.error('Server script not found at:', finalServerPath);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  Menu.setApplicationMenu(null);
  mainWindow.removeMenu();

  mainWindow.webContents.openDevTools();

  if (app.isPackaged) {
    const indexPath = path.join(process.resourcesPath, 'app', 'dist', 'index.html');
    const fallbackIndexPath = path.join(__dirname, '..', 'dist', 'index.html');
    const finalIndexPath = fs.existsSync(indexPath) ? indexPath : fallbackIndexPath;

    mainWindow.loadFile(finalIndexPath).catch((err) => {
      console.error('Failed to load index.html:', err);
    });
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }
}

app.whenReady().then(() => {
  startBackendServer();
  createWindow();
});

app.on('will-quit', () => {
  if (serverProcess) serverProcess.kill();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});