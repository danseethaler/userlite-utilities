var UserliteUtilitiesView = require('./userlite-utilities-view'),
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
        var editor = atom.workspace.getActiveTextEditor();
        this.updateStatus(editor);

    },

    // Display the number of xStdFx::printPre and exit statements in the file
    updateStatus: function(editor){

        var tiles = this.statusBar.getLeftTiles();
        for (var i = 0; i < tiles.length; i++) {
            if (tiles[i].getItem().className.indexOf('usl-buffer-info') >= 0) {
                tiles[i].destroy();
            }
        }

        if (editor && editor.buffer && editor.getGrammar().name == 'PHP') {

        } else {
            return;
        }

        var text = editor.buffer.getText();

        var parent = document.createElement('div');
        parent.className = 'usl-buffer-info inline-block';

        var pp = text.match(/(\n\s*)xStdFx::printPre/g);
        if (pp) {
            var span = document.createElement('span');
            parent.appendChild(span);

            span.textContent = '';
            span.className = 'inline-block';
            span.style.color = 'tomato';

            span.textContent = 'PrintPre: ' + pp.length;
        }

        var ex = text.match(/(\n\s*)exit/g);
        if (ex) {
            var span = document.createElement('span');
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

        // Show the printPre and exit count on startup
        atom.workspace.onDidChangeActivePaneItem(editor => {
            this.updateStatus(editor);
        });

        // Show the printPre and exit count on editor change
        atom.workspace.observeTextEditors(editor => {
            editor.buffer.onDidStopChanging(event => {
                this.updateStatus(editor);
            });
            editor.onDidChangeGrammar(event => {
                this.updateStatus(editor);
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
