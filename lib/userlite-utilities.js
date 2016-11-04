'use strict';

var UserliteUtilities,
utilities = require('./utilities'),
isValid = require('is-valid-path');

module.exports = UserliteUtilities = {

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

        utilities.statusBar = statusBar;
        var editor = atom.workspace.getActiveTextEditor();
        utilities.updateStatus(editor);

    },

    // Display the number of xStdFx::printPre and exit statements in the file
    activate: function(state) {

        // Show the printPre and exit count on startup
        atom.workspace.onDidChangeActivePaneItem(editor => {
            utilities.updateStatus(editor);
        });

        // Show the printPre and exit count on editor change
        atom.workspace.observeTextEditors(editor => {
            editor.buffer.onDidStopChanging(event => {
                utilities.updateStatus(editor);
            });
            editor.onDidChangeGrammar(event => {
                utilities.updateStatus(editor);
            });
        });

        // Add Atom commands
        atom.commands.add('atom-workspace', {
            'userlite-utilities:hFragToJS': function(event) {
                return utilities.hFragToJs(event);
            },

            'userlite-utilities:Hide-PrintPre': function(event) {
                return utilities.hidePrintPre(event);
            },

            'userlite-utilities:Show-PrintPre': function(event) {
                return utilities.showPrintPre(event);
            },

            'userlite-utilities:backoff-multi-select': function(event) {
                return utilities.backoffMultiSelect(event);
            },

            'userlite-utilities:remove-multi-select': function(event) {
                return utilities.removeMultiSelect(event);
            },

            'userlite-utilities:Cleanup': function(event) {
                return utilities.cleanup(event);
            }

        });
    },

    deactivate: function() {},

    serialize: function() {}

};
