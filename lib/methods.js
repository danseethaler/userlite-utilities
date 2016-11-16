module.exports = methods = {
    'updateStatus': function(editor){

        var tiles = this.statusBar.getLeftTiles();
        for (var i = 0; i < tiles.length; i++) {
            if (tiles[i].getItem().className) {
                if (tiles[i].getItem().className.indexOf('usl-buffer-info') >= 0) {
                    tiles[i].destroy();
                }
            }
        }

        if (!editor || !editor.buffer || editor.getGrammar().name !== 'PHP') return;

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
    'hFragToJs': function() {

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


    'hidePrintPre': function() {

        var editor = atom.workspace.getActiveTextEditor(),
        removeEnd;

        if (!editor.buffer.isModified()) removeEnd = editor.buffer.append('\n');

        editor.buffer.replace(/(\n\s*)xStdFx::printPre/g, "$1// xStdFx::printPre");

        // Also comment out any exits directly after a printPre
        if (atom.config.get('userlite-utilities.commentExitWithPrintpre')) {
            editor.buffer.replace(/(xStdFx::printPre.*\n\s*)exit;/g, "$1// exit;");
        }

        if (removeEnd) editor.buffer.delete(removeEnd);

    },

    'showPrintPre': function() {

        var editor = atom.workspace.getActiveTextEditor(),
        removeEnd;

        if (!editor.buffer.isModified()) removeEnd = editor.buffer.append('\n');

        editor.buffer.replace(/\/\/\s*xStdFx::printPre/g, "xStdFx::printPre");

        // Also uncomment any exit after a printPre
        if (atom.config.get('userlite-utilities.commentExitWithPrintpre')) {
            editor.buffer.replace(/(xStdFx::printPre.*\n\s*)\/\/ exit;/g, "$1exit;");
        }

        if (removeEnd) editor.buffer.delete(removeEnd);

    },

    'backoffMultiSelect': function(event) {

        var editor = atom.workspace.getActiveTextEditor();
        var selections = editor.getSelectedBufferRanges();

        if (selections.length > 1) {
            selections.pop();
            return editor.setSelectedBufferRanges(selections);
        }

        var currentSel = selections.pop();
        if (currentSel && (currentSel.start.column != currentSel.end.column)) {
            // If only one selection is remaining set the cursor to the
            // beginning of that selection
            return editor.setSelectedBufferRange({
                start: currentSel.start,
                end: currentSel.start,
            });

        }

        return event.abortKeyBinding();

    },

    'removeMultiSelect': function(event) {

        var editor = atom.workspace.getActiveTextEditor();
        var selections = editor.getSelectedBufferRanges();

        if (selections.length > 1) {
            return editor.setSelectedBufferRange(selections.shift());
        }

        return event.abortKeyBinding();

    },

    'incrementSelection': function(){

        var editor, lines, selections, start, baseText;
        editor = atom.workspace.getActivePaneItem();
        selections = editor.getSelections();

        if (selections.length > 1) {

            { // Start and one plus the first selection if
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
                return selection.insertText((start + index)
                .toString());
            });

        } else if (!selections[0].isEmpty()) {
            lines = selections[0].getText()
            .split('\n');
            if (lines.length > 1) {
                start = +lines[0] || 1;
                lines.forEach(function(line, index) {
                    return lines[index] = start + index;
                });
                return selections[0].insertText(lines.join('\n'));
            }
        }

    },

	'revertBuffer': function() {
		var editor, fs;
		editor = atom.workspace.getActiveTextEditor();
		if (!(editor != null ? editor.getPath() : void 0)) {
			return;
		}
		fs = require('fs');
		return fs.readFile(editor.getPath(), function(error, contents) {
			if (!error) {
				return editor.setText(contents.toString());
			}
		});
	},

    'cleanOnSave': function(){
        if (atom.config.get('userlite-utilities').cleanOnSave) methods.clean();
    },

    'clean': function(editor) {

        var replacements;

        if (typeof editor !== 'object' || typeof editor.getGrammar !== 'function') editor = atom.workspace.getActiveTextEditor();
        if (!editor) return false;

        if (editor.getGrammar().name !== 'PHP') return false;

        editor.buffer.transact(function(){

            // Manually modififying the buffer if it's not already
            // This prevents the default functionality of the buffer package
            // from saving the file after a replacement is made if the buffer
            // was previously unmodified
            var removeEnd = false;
            if (!editor.buffer.isModified()) {
                removeEnd = editor.buffer.append('\n');
            }

            // Replacements for legacy typos in the template_simple app
            editor.buffer.replace(/Udate\ DB/g, 'Update DB');
            editor.buffer.replace(/\}\s{2,}else \{/g, '} else {');

            // Remove multi-line breaks over 3 long
            editor.buffer.replace(/\n\n\n\n+/g, '\n\n\n');

            // Replace empty php tags
            editor.buffer.replace(/<\?php[\s\n]+\?>/g, '');

            // Remove white space at the end of the lines
            editor.buffer.replace(/[^\S\n]+\n+/g, '\n');

            // Replace legacy [] syntax
            do {
                replacements = editor.buffer.replace(/\barray\(([^(]*?)\)/g, '[$1]');
            } while (replacements);

            // Remove all the long comment strings that go beyond the 80 character block
            editor.buffer.backwardsScan(/\n(.*#{3,}[^\n,-]*)(-{3,})/g, function(iterator) {

                var tabCount = 0;
                if (iterator.match[0].match(/\t/g)) {
                    tabCount = iterator.match[0].match(/\t/g).length;
                }

                var addLength = tabCount * (atom.config.get('editor').tabLength - 1);

                var lenOne = iterator.match[1].length + addLength;
                var lenTwo = iterator.match[1].length + addLength;
                var fullLength = iterator.match[0].length + addLength;

                // If the first match group is greater than 80 then
                // remove any trailing dashes
                if (lenOne >= 80) {
                    return iterator.replace('\n' + iterator.match[1]);
                } else if (fullLength < 82) {
                    var missingLength = 82 - fullLength;
                    var cDashes = Array(missingLength).join("-");

                    return iterator.replace(iterator.match[0] + cDashes);

                } else if (fullLength > 80) {

                    var fullCount = 80 - lenOne;
                    var commentDashes = iterator.match[2].substr(0, fullCount);

                    return iterator.replace('\n' + iterator.match[1] + commentDashes);

                }

                throw 'Missing handling for regex match';

            });

            if (removeEnd) editor.buffer.delete(removeEnd);

        });

    }

}
