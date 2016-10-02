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
        commentPrintpreOnClose: {
            title: 'Offer to comment out Printpre on file close.',
            // description: 'This  comment/uncomment `exit;` statements that directly follow a `xStdFx::printPre`',
            type: 'boolean',
            default: true
        }
    },

    activate: function(state) {

        this.userliteUtilitiesView = new UserliteUtilitiesView(state.userliteUtilitiesViewState);

        this.modalPanel = atom.workspace.addModalPanel({
            item: this.userliteUtilitiesView.getElement(),
            visible: false
        });

        if (atom.config.get('userlite-utilities.commentPrintpreOnClose')) {

            atom.workspace.onWillDestroyPaneItem(function(paneItem){
                if (paneItem.item.buffer) {

                    paneItem.item.buffer.scan(/\n\s*xStdFx::printPre/g, function(iterator){

                        // Stop looking for matches
                        iterator.stop();

                        // Confirm commenting out the PrintPres
                        atom.confirm({
                            message: "Comment `printPres` before saving/closing?",
                            buttons: {
                                "Yes": function () {
                                    // Comment out the printPres
                                    paneItem.item.buffer.replace(/(\n\s*)xStdFx::printPre/g, "$1// xStdFx::printPre");
                                    // Save the file before closing
                                    paneItem.item.buffer.save();
                                },
                                "No": null
                            }
                        });

                    });

                    return false;
                }

            });

        }

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
            'userlite-utilities:URLtoOb': function() {

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
                editor.buffer.replace(/((\ +|\t)+\n)+/g, '\n');

            },

            // Convert the Userlite URL to a directory path
            'userlite-utilities:ulURL': function() {

                if (!atom.project.remoteftp.isConnected()) {

                    atom.project.remoteftp.readConfig();
                    setTimeout(function() {
                        atom.project.remoteftp.doConnect();
                    }, 500);

                } else {

                    var end, fileName, fullPath, pathPiece, start, workspaceElement;

                    var url = atom.clipboard.read();

                    // Remove all uncessary text
                    url = url.replace(new RegExp("\\\\", "g"), '/').trim();
                    url = url.replace('apps/userlitestoreapps/', '');
                    url = url.replace('apps/userlite/storeapps/', '');
                    url = url.replace('File: C:/web/', '');
                    url = url.replace('C:/web/', '');

                    // The live paths use app numbers so those need to be mapped
                    // for this approach to work.
                    // if (url.indexOf("File: Z:/web/app_80/uLib/") >= 0)
                    //     url = 'master/' + url.replace('File: Z:/web/app_80/uLib/', '');
                    // if (url.indexOf("Z:/web/app_80/uLib/") >= 0)
                    //     url = 'master/' + url.replace('Z:/web/', '');


                    atom.clipboard.write(url);

                    if (url.indexOf('#') > 0) {

                        fullPath = 'projects/';

                        start = url.indexOf('lite/') + 5;

                        if (start < 5) {
                            start = url.indexOf('/', 10) + 1;
                        }

                        end = url.indexOf('/', start);

                        var appName = url.substring(start, end);

                        var replaceNames = {
                            products: 'digicat',
                            form: 'contact',
                            training1: 'training',
                            pages1: 'landing',
                            recipes1: 'recipes',
                            torrey: 'landing',
                            boulder: 'landing',
                            website: 'landing',
                            websites: 'landing',
                            diesel: 'sellerz',
                            jeep: 'sellerz',
                            setup: 'instancemanager',
                            sds: 'sdsclient',
                            bootstacks1: 'bts',
                            gallery: 'catalog',
                            instancesmanager: 'instancemanager',
                            setup: 'instancemanager',
                            blog: 'stories',
                            transition: 'languagetribetransition',
                            lessons: 'languagetribelessons',
                            language: 'languagetribelessons',
                            shopping: 'xrshopping',
                        };

                        if (replaceNames[appName]) {
                            appName = replaceNames[appName];
                        }

                        var replaceVersions = {
                            sdsclient: 'v998',
                            sds: 'v998'
                        };

                        var version = 'v999';

                        if (replaceVersions[appName]) {
                            version = replaceVersions[appName];
                        }

                        fullPath += appName + '/' + version + '/uMod/lib/mods/';

                        if (appName == 'users') {
                            fullPath = 'root/projects/apps/userlitemods/users/v101/uMod/lib/mods/';
                        }

                        urlarray = url.substr(url.lastIndexOf('#')).split('::');

                        url = urlarray.pop();

                        if (url === '') {
                            url = urlarray.pop();
                        }

                        url = [url];

                        // Remove the activity node from the hashfrag
                        if (url[0].indexOf('page:stream') >= 0) {
                            url = [urlarray.pop()];
                        }

                        // Remove the common list node if the previous node
                        // does not have a plural item (ending with an 's')
                        if (url[0].indexOf('p:list') >= 0) {

                            pathPieceCheck = urlarray.pop();

                            start = pathPieceCheck.indexOf('p:') + 2;
                            end = pathPieceCheck.indexOf('|', start);

                            if (end <= 0) {
                                fileName = pathPieceCheck.substring(start);
                            } else {
                                fileName = pathPieceCheck.substring(start, end);
                            }

                            var finalChar = fileName.substr(fileName.length - 1).toLowerCase();

                            if (finalChar != 's') {
                                url = [pathPieceCheck];
                            }
                        }

                        while (url.length > 0) {

                            pathPiece = url.shift();

                            if (url.length === 0) {

                                start = pathPiece.indexOf('p:') + 2;
                                end = pathPiece.indexOf('|', start);

                                if (end <= 0) {
                                    fileName = pathPiece.substring(start) + '.php';
                                } else {
                                    fileName = pathPiece.substring(start, end) + '.php';
                                }
                            }

                            start = pathPiece.indexOf('n:') + 2;
                            end = pathPiece.indexOf('|', start);

                            if (end <= 0) {
                                pathPiece = pathPiece.substring(start);
                            } else {
                                pathPiece = pathPiece.substring(start, end);
                            }

                            fullPath += pathPiece;
                        }

                        fullPath += '/' + fileName;

                        if (['projects', 'master', 'root'].indexOf(fullPath.split('/')[0]) >= 0) {
                            atom.project.remoteftp.root.openPath('/' + fullPath);
                        }
                        //
                        //
                        // atom.clipboard.write(fullPath);
                        //
                        // workspaceElement = atom.views.getView(atom.workspace);
                        // atom.commands.dispatch(workspaceElement, 'fuzzy-finder:toggle-file-finder');

                    } else {
                        // If the hash is not found in the clipboard
                        // contents then try to navigate to the path
                        if (url.split('/')[0] === 'projects' || url.split('/')[0] === 'master') {
                            url = '/' + url;
                            if (isValid(url)) {
                                atom.project.remoteftp.root.openPath(url);
                            } else {
                                atom.notifications.addWarning('Clipboard content not valid url.', {
                                    dismissable: true
                                });
                            }
                        }
                    }
                }
            },

            // Convert the Userlite URL to a directory path on the master config
            'userlite-utilities:ulMasterUrl': function() {

                if (!atom.project.remoteftp.isConnected()) {

                    atom.project.remoteftp.readConfig();
                    setTimeout(function() {
                        atom.project.remoteftp.doConnect();
                    }, 500);

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

                    // This needs to be added to the Remote-FTP package
                    // if(!FS.exists(ftpConfigPath)) {
                    //     atom.notifications.addWarning('.ftpconfig file not found.', {
                    //         dismissable: true
                    //     });
                    //     return false;
                    // }

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

            'userlite-utilities:nav-current': function() {

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

            'userlite-utilities:nav-xEnd': function() {

                if (!atom.project.remoteftp.isConnected()) {

                    atom.project.remoteftp.readConfig();
                    setTimeout(function() {
                        atom.project.remoteftp.doConnect();
                    }, 500);

                } else {

                    var path = document.getElementsByClassName('current-path')[0].innerHTML.split('/');

                    if (path[0] === 'projects') {

                        var backPath = '/master/';

                        appName = path.slice(1, 2)[0];
                        appName = appName.charAt(0).toUpperCase() + appName.slice(1);

                        backPath += path.slice(1, 3).join('/') + '/uLib/' + appName + '/App.php';

                        // Open the App folder
                        atom.project.remoteftp.root.openPath(backPath.slice(0, backPath.length - 4));
                        // Select the App.php file
                        atom.project.remoteftp.root.openPath(backPath);
                    } else if (path[0] === 'master') {

                        var frontPath = '/projects/';

                        if (path[0] === 'master') {
                            appName = path.slice(1, 2)[0];
                            appName = appName.charAt(0).toUpperCase() + appName.slice(1);

                            frontPath += path.slice(1, 3).join('/') + '/uMod/lib/mods/app/start.php';
                            atom.project.remoteftp.root.openPath(frontPath);
                        }

                    }

                }

            },

            'userlite-utilities:navMaster-xEnd': function() {

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
