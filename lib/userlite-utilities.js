var UserliteUtilitiesView = require('./userlite-utilities-view'),
FS = require('fs-extra'),
isValid = require('is-valid-path');

module.exports = UserliteUtilities = {
    userliteUtilitiesView: null,
    modalPanel: null,

    config: {
        commentExitWithPrintpre: {
            title: 'Toggle exit comment with printPre',
            description: 'This will comment/uncomment `exit;` statements that directly follow a `xStdFx::printPre`',
            type: 'boolean',
            default: true
        },
    },

    // Setup the status bar and call the update status
    consumeStatusBar: function(statusBar){

        this.statusBar = statusBar;

        var text = atom.workspace.getActiveTextEditor().buffer.getText();
        this.updateStatus(text);

    },

    // Display the number of xStdFx::printPre and exit statements in the file
    updateStatus: function(text){

        var tiles = this.statusBar.getLeftTiles();
        for (var i = 0; i < tiles.length; i++) {
            if (tiles[i].getItem().className.indexOf('usl-buffer-info') >= 0) {
                tiles[i].destroy();
            }
        }

        var parent = document.createElement('div');
        parent.className = 'usl-buffer-info inline-block';

        var pp = text.match(/(\n\s*)xStdFx::printPre/g);
        if (pp) {
            var span = document.createElement('div');
            parent.appendChild(span);

            span.textContent = '';
            span.className = 'inline-block';
            span.style.color = 'tomato';

            span.textContent = 'PrintPre: ' + pp.length;
        }

        var ex = text.match(/(\n\s*)exit/g);
        if (ex) {
            var span = document.createElement('div');
            parent.appendChild(span);

            span.textContent = '';
            span.className = 'inline-block';
            span.style.color = 'burlywood';

            span.textContent = 'Exit: ' + ex.length;
        }

        this.statusBar.addLeftTile({
            item: parent,
            priority: 100,
        });

    },

    activate: function(state) {

        this.userliteUtilitiesView = new UserliteUtilitiesView(state.userliteUtilitiesViewState);

        this.modalPanel = atom.workspace.addModalPanel({
            item: this.userliteUtilitiesView.getElement(),
            visible: false,
        });

        atom.workspace.observeTextEditors(function(editor){
            editor.buffer.onDidStopChanging(function(event){
                var text = editor.buffer.getText();
                this.updateStatus(text);
            }.bind(this));
        }.bind(this))

        // TODO: This should probably be added to the Remote-FTP package
        // so the event will only be fired if the FTP is connected
        // Event listener to navigate to file whenever file is opened
        // or tab is changed
        atom.workspace.onDidChangeActivePaneItem(function(item) {

            // Change the selected file in the sidebar to be the active file
            setTimeout(function(){
                var path = '/' + document.getElementsByClassName('current-path')[0].innerHTML;

                // Only select files (not folders) in the treeview
                if (path.indexOf('.', path.lastIndexOf('/')) > 0) {

                    var files = document.querySelectorAll('.entry.selected');

                    for (var i = 0; i < files.length; i++) {
                        files[i].classList.remove('selected');
                    }

                    if (document.querySelector('[data-path="' + path + '"]'))
                    document.querySelector('[data-path="' + path + '"]').parentNode.classList.add('selected');

                }

            });

        });

        // Add Atom commands
        atom.commands.add('atom-workspace', {
            'userlite-utilities:hFragToJS': function() {

                var url = atom.clipboard.read();

                if (url.indexOf('#!') >= 0) {
                    url = url.substr(url.indexOf('#!') + 2).split('||');
                } else {
                    url = url.substr(url.indexOf('#!') + 1).split('||');
                }
                var jsUrl = {};

                try {
                    for (var i = 0; i < url.length; i++) {
                        var ob = url[i].split('::');

                        // Ignore activity
                        if (ob[0] != 'litenb') {

                            jsUrl[ob[0]] = {};

                            var props = ob[1].split('|');

                            for (var p = 0; p < props.length; p++) {
                                var prop = props[p].split(':');

                                if (prop[0].indexOf('id') >= 0) {
                                    prop[1] = '';
                                }

                                // Exclude UL rounding
                                if (prop[0].indexOf('rnd') < 0) {
                                    jsUrl[ob[0]][prop[0]] = prop[1];
                                }else if (prop[1] == '123') {
                                    jsUrl[ob[0]].rnd = 'Math.floor(Math.random() * 9999)';
                                }
                            }
                        }

                    }
                } catch (e) {
                    atom.notifications.addWarning('Clipboard content not valid identifier.', {
                        dismissable: true
                    });
                    return;
                }

                var stringified = JSON.stringify(jsUrl);

                // Remove the quotes from the properties
                stringified = stringified.replace(/\"([^(\")"]+)\":/g, "$1:");

                stringified = stringified.replace('"Math.floor(Math.random() * 9999)"', "Math.floor(Math.random() * 9999)");

                // Change double quotes to single quotes
                stringified = stringified.replace(/"/g, "'");

                stringified = 'hFrag.click(' + stringified + '); return false;';

                atom.clipboard.write(stringified);

            },


            'userlite-utilities:Hide-PrintPre': function() {

                var editor = atom.workspace.getActiveTextEditor();
                editor.buffer.replace(/(\n\s*)xStdFx::printPre/g, "$1// xStdFx::printPre");

                // Also comment out any exits directly after a printPre
                if (atom.config.get('userlite-utilities.commentExitWithPrintpre')) {
                    editor.buffer.replace(/(xStdFx::printPre.*\n\s*)exit;/g, "$1// exit;");
                }

            },

            'userlite-utilities:Show-PrintPre': function() {

                var editor = atom.workspace.getActiveTextEditor();
                editor.buffer.replace(/\/\/\s*xStdFx::printPre/g, "xStdFx::printPre");

                // Also uncomment any exit after a printPre
                if (atom.config.get('userlite-utilities.commentExitWithPrintpre')) {
                    editor.buffer.replace(/(xStdFx::printPre.*\n\s*)\/\/ exit;/g, "$1exit;");
                }

            },

            'userlite-utilities:Cleanup': function() {

                var editor = atom.workspace.getActiveTextEditor();

                // Remove all the long comment strings that go beyond the 80 character block
                editor.buffer.backwardsScan(/\n.{80}\-+\n/g, function(iterator) {

                    if (iterator.matchText.indexOf('####') > 0) {
                        var baseLength = 81;

                        // Account for the tab length if tabs exist
                        if (match = iterator.matchText.match(/\t/g)) {
                            var tabCount = match.length;
                            baseLength -= tabCount * (atom.config.get('editor').tabLength - 1);
                        }

                        iterator.replace(iterator.matchText.substr(0, baseLength) + '\n');

                    }

                });

                // Remove multi-line breaks over 3 long
                editor.buffer.replace(/\n\n\n\n+/g, '\n\n\n');

                // Remove white space at the end of the lines
                editor.buffer.replace(/[^\S\n]+\n+/g, '\n');

            },

            // Convert the Userlite URL to a directory path on the master config
            'userlite-utilities:autoNav': function() {

                if (!atom.project.remoteftp.isConnected()) {

                    atom.project.remoteftp.readConfig();
                    setTimeout(function() {
                        atom.project.remoteftp.doConnect();
                    }, 200);

                } else {

                    var utilities = {
                        tryParseJSON: function(jsonString){
                            try {
                                var o = JSON.parse(jsonString);
                                if (o && typeof o === "object") {
                                    return o;
                                }
                            }
                            catch (e) { }
                            return false;
                        }
                    };

                    var config = atom.clipboard.read();

                    if (!utilities.tryParseJSON(config)) {
                        atom.notifications.addWarning('Clipboard content not valid config.', {
                            dismissable: true
                        });
                        return false;
                    }

                    config = JSON.parse(config);

                    var ftpConfigPath = atom.project.getDirectories()[0].resolve('.ftpconfig');
                    var ftpConfig = FS.readJsonSync(ftpConfigPath, {throws: false});

                    if (!ftpConfig || !ftpConfig.userlite) {
                        atom.notifications.addWarning('.ftpConfig file not configured properly.', {
                            dismissable: true
                        });
                        return false;
                    }

                    if (!ftpConfig.userlite.mappings[config.appId]) {
                        atom.notifications.addWarning('.ftpConfig file is missing appId ' + config.appId + '.', {
                            dismissable: true
                        });
                        return false;
                    }

                    // For now we're referencing the first occurence of an appId
                    // in the mappings config. We could make this more robust
                    // to look for an open path already or something
                    var basePath = '/' + ftpConfig.userlite.mappings[config.appId][0];
                    if (config.fullPath == 'pages') {
                        var path = basePath + '/frontend/pages/inc.php';
                    } else if (config.appSide == 'front') {
                        var path = basePath + '/frontend/mods/' + config.fullPath;
                    } else {
                        var path = basePath + '/backend/App/Instance.php';
                    }

                    atom.project.remoteftp.root.openPath(path);

                }

            },

            'userlite-utilities:navCurrent': function() {

                if (atom.project.remoteftp) {

                    if (!atom.project.remoteftp.isConnected()) {

                        atom.project.remoteftp.readConfig();
                        setTimeout(function() {
                            atom.project.remoteftp.doConnect();
                        }, 500);

                    } else {
                        var path = '/' + document.getElementsByClassName('current-path')[0].innerHTML;
                        atom.project.remoteftp.root.openPath(path);

                    }
                }
            },

            'userlite-utilities:navXend': function() {

                if (!atom.project.remoteftp.isConnected()) {

                    atom.project.remoteftp.readConfig();
                    setTimeout(function() {
                        atom.project.remoteftp.doConnect();
                    }, 500);

                } else {

                    var path = document.getElementsByClassName('current-path')[0].innerHTML.split('/');

                    if (path[2] === 'frontend') {

                        var backPath = '/' + path[0] + '/' + path[1] + '/backend/App/Instance.php';

                        // Navigate to the backend file
                        atom.project.remoteftp.root.openPath(backPath);

                    } else if (path[2] === 'backend') {

                        var frontPath = '/' + path[0] + '/' + path[1] + '/frontend/mods/start/inc.php';

                        // Navigate to the frontend file
                        atom.project.remoteftp.root.openPath(frontPath);

                    }

                }

            }

        });
    },
    deactivate: function() {
        this.modalPanel.destroy();
        return this.userliteUtilitiesView.destroy();
    },
    serialize: function() {
        return {
            userliteUtilitiesViewState: this.userliteUtilitiesView.serialize()
        };
    }
};
