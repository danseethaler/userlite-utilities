module.exports = methods = {
    updateStatus: function(editor) {
        var tiles = this.statusBar.getLeftTiles();
        for (var i = 0; i < tiles.length; i++) {
            if (tiles[i].getItem().className) {
                if (
                    tiles[i].getItem().className.indexOf('usl-buffer-info') >= 0
                ) {
                    tiles[i].destroy();
                }
            }
        }

        if (!editor || !editor.buffer || editor.getGrammar().name !== 'PHP')
            return;

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
            priority: 100
        });
    },
    hFragToJs: function() {
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
                        } else if (prop[1] == '123') {
                            jsUrl[ob[0]].rnd =
                                'Math.floor(Math.random() * 9999)';
                        }
                    }
                }
            }
        } catch (e) {
            atom.notifications.addWarning(
                'Clipboard content not valid identifier.',
                {
                    dismissable: true
                }
            );
            return;
        }

        var stringified = JSON.stringify(jsUrl);

        // Remove the quotes from the properties
        stringified = stringified.replace(/\"([^(\")"]+)\":/g, '$1:');

        stringified = stringified.replace(
            '"Math.floor(Math.random() * 9999)"',
            'Math.floor(Math.random() * 9999)'
        );

        // Change double quotes to single quotes
        stringified = stringified.replace(/"/g, "'");

        stringified = 'hFrag.click(' + stringified + '); return false;';

        atom.clipboard.write(stringified);
    },

    hidePrintPre: function() {
        var editor = atom.workspace.getActiveTextEditor(),
            removeEnd;

        if (!editor.buffer.isModified()) removeEnd = editor.buffer.append('\n');

        editor.buffer.replace(
            /(\n\s*)xStdFx::printPre/g,
            '$1// xStdFx::printPre'
        );

        // Also comment out any exits directly after a printPre
        if (atom.config.get('userlite-utilities.commentExitWithPrintpre')) {
            editor.buffer.replace(
                /(xStdFx::printPre.*\n\s*)exit;/g,
                '$1// exit;'
            );
        }

        if (removeEnd) editor.buffer.delete(removeEnd);
    },

    showPrintPre: function() {
        var editor = atom.workspace.getActiveTextEditor(),
            removeEnd;

        if (!editor.buffer.isModified()) removeEnd = editor.buffer.append('\n');

        editor.buffer.replace(/\/\/\s*xStdFx::printPre/g, 'xStdFx::printPre');

        // Also uncomment any exit after a printPre
        if (atom.config.get('userlite-utilities.commentExitWithPrintpre')) {
            editor.buffer.replace(
                /(xStdFx::printPre.*\n\s*)\/\/ exit;/g,
                '$1exit;'
            );
        }

        if (removeEnd) editor.buffer.delete(removeEnd);
    },

    backoffMultiSelect: function(event) {
        var editor = atom.workspace.getActiveTextEditor();
        var selections = editor.getSelectedBufferRanges();

        if (selections.length > 1) {
            selections.pop();
            return editor.setSelectedBufferRanges(selections);
        }

        var currentSel = selections.pop();
        if (currentSel && currentSel.start.column != currentSel.end.column) {
            // If only one selection is remaining set the cursor to the
            // beginning of that selection
            return editor.setSelectedBufferRange({
                start: currentSel.start,
                end: currentSel.start
            });
        }

        return event.abortKeyBinding();
    },

    removeMultiSelect: function(event) {
        var editor = atom.workspace.getActiveTextEditor();
        var selections = editor.getSelectedBufferRanges();

        if (selections.length > 1) {
            return editor.setSelectedBufferRange(selections.shift());
        }

        return event.abortKeyBinding();
    },

    incrementSelection: function() {
        var editor, lines, selections, start, baseText;
        editor = atom.workspace.getActivePaneItem();
        selections = editor.getSelections();

        if (selections.length > 1) {
            {
                // Start and one plus the first selection if
                // all selections arent' the same value
                start = 0;
                baseText = +selections[0].getText();
                selections.forEach(function(selection, index) {
                    if (baseText != +selection.getText()) {
                        start = 1;
                        return false;
                    }
                });

                start = baseText + start || 1;
            }

            return selections.forEach(function(selection, index) {
                return selection.insertText((start + index).toString());
            });
        } else if (!selections[0].isEmpty()) {
            lines = selections[0].getText().split('\n');
            if (lines.length > 1) {
                start = +lines[0] || 1;
                lines.forEach(function(line, index) {
                    return (lines[index] = start + index);
                });
                return selections[0].insertText(lines.join('\n'));
            }
        }
    },

    revertBuffer: function() {
        var editor = atom.workspace.getActiveTextEditor();
        if (!editor) return;
        editor.buffer.reload();
    },

    closeWorkspace: function() {
        var activePane = atom.workspace.getActivePane();
        if (!activePane) return;

        var items = activePane.getItems();

        var paths = items
            .map(item => {
                if (!atom.workspace.isTextEditor(item)) return;

                var editor = item;
                var config = {
                    path: editor.getPath() || false,
                    grammarName: editor.getGrammar().name,
                    modified: editor.isModified(),
                    buffer: editor.isModified() ? editor.buffer.getText() : null
                };

                item.destroy();

                return config;
            })
            .filter(item => {
                return typeof item === 'object';
            });

        if (!paths.length) return;

        var currentFiles =
            atom.config.get('userlite-utilities.workspaceFiles') || '[]';

        currentFiles = JSON.parse(currentFiles);
        currentFiles = currentFiles.concat(paths);

        atom.config.set(
            'userlite-utilities.workspaceFiles',
            JSON.stringify(currentFiles)
        );
    },

    openWorkspace: function() {
        // Get the stored files
        var currentFiles =
            atom.config.get('userlite-utilities.workspaceFiles') || '[]';
        currentFiles = JSON.parse(currentFiles);

        currentFiles.map(config => {
            atom.workspace.open(config.path).then(editor => {
                if (config.modified) editor.buffer.setText(config.buffer);

                if (!config.path && config.grammarName) {
                    var editorGrammar = atom.grammars.grammars.find(grammar => {
                        return grammar.name == config.grammarName;
                    });

                    editor.setGrammar(editorGrammar);
                }
            });
        });

        // Clear the config storage
        atom.config.unset('userlite-utilities.workspaceFiles');
    }
};
