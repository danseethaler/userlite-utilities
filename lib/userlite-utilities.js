var UserliteUtilitiesView = require('./userlite-utilities-view'),
    FS = require('fs-extra'),
    isValid = require('is-valid-path');

module.exports = UserliteUtilities = {
    userliteUtilitiesView: null,
    modalPanel: null,
    activate: function(state) {

        this.userliteUtilitiesView = new UserliteUtilitiesView(state.userliteUtilitiesViewState);

        this.modalPanel = atom.workspace.addModalPanel({
            item: this.userliteUtilitiesView.getElement(),
            visible: false
        });

        // TODO: This should probably be added to the Remote-FTP package
        // so the event will only be fired if the FTP is connected
        // Event listener to navigate to file whenever file is opened
        // or tab is changed
        atom.workspace.onDidChangeActivePaneItem(function(item) {

            setTimeout(function(){
                var path = '/' + document.getElementsByClassName('current-path')[0].innerHTML;

                // Only select files (not folders) in the treeview
                if (path.indexOf('.', path.lastIndexOf('/')) > 0) {

                    var files = document.querySelectorAll('.file.entry.list-item, .directory.entry');

                    for (var i = 0; i < files.length; i++) {
                        files[i].classList.remove('selected');
                    }

                    if (document.querySelector('[data-path="' + path + '"]'))
                        document.querySelector('[data-path="' + path + '"]').parentNode.classList.add('selected');

                }

            });

            // TODO: Add config option to this code block
            // If this project has a .ftpconfig file
            // FS.readFile(atom.project.getDirectories()[0].resolve('.ftpconfig'), 'utf8', function(err, data) {
            //     if (!err) {
            //         var workspaceElement = atom.views.getView(atom.workspace);
            //
            //         // Navigate to the current file
            //         setTimeout(function() {
            //             atom.commands.dispatch(workspaceElement, 'userlite-utilities:nav-current');
            //         });
            //     }
            // });

        });

        // Add Atom commands
        atom.commands.add('atom-workspace', {
            'userlite-utilities:URLtoOb': function() {

                var url = atom.clipboard.read();

                if (url.indexOf('#!') >= 0) {
                    url = url.substr(url.indexOf('#!') + 2).split('||');
                }else {
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
            'userlite-utilities:Replicate': function() {
                var readable = FS.createReadStream('/Users/danseethaler/Developer/poopboss/public_html/index.html', {
                    encoding: 'utf8',
                    highWaterMark: 100
                });

                readable.on('data', function(chunk) {
                    console.log(chunk);
                });

            },
            'userlite-utilities:GetS3Path': function() {

                var currentPath = document.getElementsByClassName('current-path')[0].innerHTML;

                if (currentPath.substr(0, 'master'.length) === 'master') {

                    currentPath = currentPath.substr(6);
                    currentPath = currentPath.substr(0, currentPath.lastIndexOf('/') + 1);

                    var s3Path = "https://console.aws.amazon.com/s3/home?region=us-east-1#&bucket=codeversion&prefix=dev/master/apps/userlite/storeapps" + currentPath;

                    atom.clipboard.write(s3Path);

                    return s3Path;

                }

                if (currentPath.substr(0, 'projects'.length) === 'projects') {

                    currentPath = currentPath.substr(8);
                    currentPath = currentPath.substr(0, currentPath.lastIndexOf('/') + 1);

                    var s3Path = "https://console.aws.amazon.com/s3/home?region=us-east-1#&bucket=codeversion&prefix=dev/projects/apps/userlitestoreapps" + currentPath;

                    atom.clipboard.write(s3Path);

                    return s3Path;

                }

                atom.notifications.addError("Path unavailable for this file.");
                return false;

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
                            blog: 'stories',
                            shop: 'digicat',
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
                            }else {
                                atom.notifications.addWarning('Clipboard content not valid url.', {
                                    dismissable: true
                                });
                            }
                        }
                    }
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
