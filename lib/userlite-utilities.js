var UserliteUtilitiesView = require('./userlite-utilities-view'),
    fs = require('fs-extra');

module.exports = UserliteUtilities = {
    userliteUtilitiesView: null,
    modalPanel: null,
    activate: function(state) {

        this.userliteUtilitiesView = new UserliteUtilitiesView(state.userliteUtilitiesViewState);

        this.modalPanel = atom.workspace.addModalPanel({
            item: this.userliteUtilitiesView.getElement(),
            visible: false
        });

        // Event listener to navigate to file whenever file is opened
        // or tab is changed
        atom.workspace.onDidChangeActivePaneItem(function(item){

            var workspaceElement = atom.views.getView(atom.workspace);

            setTimeout(function(){
                atom.commands.dispatch(workspaceElement, 'userlite-utilities:nav-current');
            });

        });

        // Add Atom commands
        atom.commands.add('atom-workspace', {
            'userlite-utilities:ulURL': function() {

                var end, fileName, fullPath, pathPiece, start, workspaceElement;

                var url = atom.clipboard.read();

                url = url.replace(new RegExp("\\\\","g") , '/');
                url = url.replace('apps/userlite/storeapps/', '');

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
                        products: 'digicat'
                    }

                    if (replaceNames[appName]) {
                        appName = replaceNames[appName];
                    }

                    fullPath += appName + '/v999/uMod/lib/mods/';
                    url = [url.substr(url.lastIndexOf('#')).split('::').pop()];

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

                    atom.clipboard.write(fullPath);

                    workspaceElement = atom.views.getView(atom.workspace);
                    atom.commands.dispatch(workspaceElement, 'fuzzy-finder:toggle-file-finder');

                }else {
                    // If the hash is not found in the clipboard
                    // contents then try to navigate to the path
                    if (url.split('/')[0] === 'projects' || url.split('/')[0] === 'master') {
                        atom.project.remoteftp.root.openPath('/' + url);
                    }
                }
            },
            'userlite-utilities:nav-current': function() {
                if (!atom.project.remoteftp.isConnected()) {

                    atom.project.remoteftp.readConfig();
                    setTimeout(function() {
                        atom.project.remoteftp.doConnect();
                    }, 500);

                } else {
                    var path = '/' + document.getElementsByClassName('current-path')[0].innerHTML;
                    atom.project.remoteftp.root.openPath(path);
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

                        var appName = path.slice(1, 2)[0];
                        var appName = appName.charAt(0).toUpperCase() + appName.slice(1);

                        backPath += path.slice(1, 3).join('/') + '/uLib/' + appName + '/App.php';

                        // Open the App folder
                        atom.project.remoteftp.root.openPath(backPath.slice(0, backPath.length - 4));
                        // Select the App.php file
                        atom.project.remoteftp.root.openPath(backPath);
                    } else if (path[0] === 'master') {

                        var frontPath = '/projects/';

                        if (path[0] === 'master') {
                            var appName = path.slice(1, 2)[0];
                            var appName = appName.charAt(0).toUpperCase() + appName.slice(1);

                            frontPath += path.slice(1, 3).join('/') + '/uMod/lib/mods/app/start.php';
                            atom.project.remoteftp.root.openPath(frontPath);
                        }

                    }

                }

            }
        })
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
