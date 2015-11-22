var CompositeDisposable, UserliteUtilities, UserliteUtilitiesView;

UserliteUtilitiesView = require('./userlite-utilities-view');

CompositeDisposable = require('atom').CompositeDisposable;

module.exports = UserliteUtilities = {
    userliteUtilitiesView: null,
    modalPanel: null,
    subscriptions: null,
    activate: function(state) {

        this.userliteUtilitiesView = new UserliteUtilitiesView(state.userliteUtilitiesViewState);

        this.modalPanel = atom.workspace.addModalPanel({
            item: this.userliteUtilitiesView.getElement(),
            visible: false
        });

        // Add event listener to item open
        atom.workspace.onDidOpen(function(event) {
            var workspaceElement;

            workspaceElement = atom.views.getView(atom.workspace);

            atom.commands.dispatch(workspaceElement, 'remote-ftp:navigate-to-current');

        });

        this.subscriptions = new CompositeDisposable;

        return this.subscriptions.add(atom.commands.add('atom-workspace', {
            'userlite-utilities:ulURL': (function(_this) {
                return function() {
                    return _this['userlite-utilities:ulURL']();
                };
            })(this)
        }));

    },
    deactivate: function() {
        this.modalPanel.destroy();
        this.subscriptions.dispose();
        return this.userliteUtilitiesView.destroy();
    },
    serialize: function() {
        return {
            userliteUtilitiesViewState: this.userliteUtilitiesView.serialize()
        };
    },
    'userlite-utilities:ulURL': function() {

        var end, fileName, fullPath, pathPiece, start, url, workspaceElement;

        url = atom.clipboard.read();

        if (url.indexOf('#') > 0) {

            fullPath = 'projects/';

            start = url.indexOf('lite/') + 5;
            end = url.indexOf('/', start);

            fullPath += url.substring(start, end) + '/mods/';
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

                pathPiece = pathPiece.substring(start, end);
                fullPath += pathPiece;
            }

            fullPath += '/' + fileName;

            atom.clipboard.write(fullPath);

            workspaceElement = atom.views.getView(atom.workspace);
            atom.commands.dispatch(workspaceElement, 'fuzzy-finder:toggle-file-finder');

        }
    }
};
