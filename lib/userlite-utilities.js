'use strict';

var UserliteUtilities,
    methods = require('./methods'),
    isValid = require('is-valid-path');

module.exports = UserliteUtilities = {
    config: {
        commentExitWithPrintpre: {
            title: 'Toggle exit comment with printPre',
            description:
                'This will comment/uncomment `exit;` statements that directly follow a `xStdFx::printPre`',
            type: 'boolean',
            default: true
        }
    },

    // Setup the status bar and call the update status
    consumeStatusBar: function(statusBar) {
        methods.statusBar = statusBar;
        var editor = atom.workspace.getActiveTextEditor();
        methods.updateStatus(editor);
    },

    // Display the number of xStdFx::printPre and exit statements in the file
    activate: function(state) {
        // Show the printPre and exit count on startup
        atom.workspace.onDidChangeActivePaneItem(editor => {
            methods.updateStatus(editor);
        });

        // Show the printPre and exit count on editor change
        atom.workspace.observeTextEditors(editor => {
            editor.buffer.onDidStopChanging(event => {
                methods.updateStatus(editor);
            });
            editor.onDidChangeGrammar(event => {
                methods.updateStatus(editor);
            });
        });

        // Add Atom commands
        atom.commands.add('atom-workspace', {
            'userlite-utilities:hFragToJS': function(event) {
                return methods.hFragToJs(event);
            },

            'userlite-utilities:Hide-PrintPre': function(event) {
                return methods.hidePrintPre(event);
            },

            'userlite-utilities:Show-PrintPre': function(event) {
                return methods.showPrintPre(event);
            },

            'userlite-utilities:close-workspace': function(event) {
                return methods.closeWorkspace(event);
            },

            'userlite-utilities:open-workspace': function(event) {
                return methods.openWorkspace(event);
            },

            'userlite-utilities:backoff-multi-select': function(event) {
                return methods.backoffMultiSelect(event);
            },

            'userlite-utilities:remove-multi-select': function(event) {
                return methods.removeMultiSelect(event);
            },

            'userlite-utilities:increment-selection': function(event) {
                return methods.incrementSelection(event);
            },

            'userlite-utilities:revertBuffer': function(event) {
                return methods.revertBuffer(event);
            }
        });
    },

    deactivate: function() {},

    serialize: function() {}
};
