const {app,BrowserWindow,Menu,Tray,ipcMain} = require('electron');
var loadedwc=false;
ipcMain.on('baloon', (event, arg) => {
            tray.displayBalloon({icon:__dirname +"/monitormastertray.png",title:"Monitor Master",content:arg});
})
ipcMain.on('quit', (event, arg) => {
    app.isQuiting = true;
    app.quit();
})
    // Keep a global reference of the window object, if you don't, the window will
    // be closed automatically when the JavaScript object is garbage collected.
    let win
    var hidden=false;
    function createWindow () {
        // Create the browser window.
        win = new BrowserWindow({width: 1200, height: 900,resizable:true,"minHeight": 410,icon: __dirname +"/monitormastertray.png",
            "minWidth": 715})
        tray = new Tray(__dirname +"/monitormastertray.png")
        const contextMenu = Menu.buildFromTemplate([

        { label: 'Show App', click:  function(){
            win.show();
            if(loadedwc)
                win.webContents.send('hidden', false);
        } },
        { label: 'Quit', click:  function(){
            app.isQuiting = true;
            app.quit();

        } }
        ]);
        tray.on('click', () => {
            if(win.isVisible())
            {
                win.hide()
                if(loadedwc)
                    win.webContents.send('hidden', true);
            }
            else
            {
                win.show()
                if(loadedwc)
                    win.webContents.send('hidden', false);
            }
        });
        tray.setToolTip('DiaMonitor');
        tray.setContextMenu(contextMenu);
        // and load the index.html of the app.
        win.loadURL(`file://${__dirname}/index.html`)

        // Open the DevTools.
        //win.webContents.openDevTools()

        /*// Emitted when the window is closed.
        win.on('closed', () => {
            // Dereference the window object, usually you would store windows
            // in an array if your app supports multi windows, this is the time
            // when you should delete the corresponding element.
            win = null
        })*/
        win.on('minimize',function(event){
            event.preventDefault()
            win.hide();
            if(loadedwc)
                win.webContents.send('hidden', true);
        });
        win.webContents.on('did-finish-load', () => {
            loadedwc=true;
        })


        win.on('close', function (event) {
            app.isQuiting = true;
            app.quit();
        });
        win.on('closed', function() {
            // Dereference the window object, usually you would store windows
            // in an array if your app supports multi windows, this is the time
            // when you should delete the corresponding element.
            win = null;
        });

        /*var contextMenu = Menu.buildFromTemplate([

        { label: 'Show App', click:  function(){
            win.show();
        } },
        { label: 'Quit', click:  function(){
            app.isQuiting = true;
            app.quit();

        } }
        ]);*/
    }

    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    app.on('ready', createWindow)

    // Quit when all windows are closed.
    app.on('window-all-closed', () => {
        // On macOS it is common for applications and their menu bar
        // to stay active until the user quits explicitly with Cmd + Q
        if (process.platform !== 'darwin') {
            app.quit()
        }
    })

    app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (win === null) {
            createWindow()
        }
    })

    
    var path = require('path');
    