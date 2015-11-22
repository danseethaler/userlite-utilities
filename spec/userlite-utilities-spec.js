var UserliteUtilities;

UserliteUtilities = require('../lib/userlite-utilities');

describe("UserliteUtilities", function() {
    var activationPromise, ref, workspaceElement;
    ref = [], workspaceElement = ref[0], activationPromise = ref[1];
    beforeEach(function() {
        workspaceElement = atom.views.getView(atom.workspace);
        return activationPromise = atom.packages.activatePackage('userlite-utilities');
    });
    return describe("when the userlite-utilities:ulURL event is triggered", function() {
        it("hides and shows the modal panel", function() {
            expect(workspaceElement.querySelector('.userlite-utilities')).not.toExist();
            atom.commands.dispatch(workspaceElement, 'userlite-utilities:ulURL');
            waitsForPromise(function() {
                return activationPromise;
            });
            return runs(function() {
                var userliteUtilitiesElement, userliteUtilitiesPanel;
                expect(workspaceElement.querySelector('.userlite-utilities')).toExist();
                userliteUtilitiesElement = workspaceElement.querySelector('.userlite-utilities');
                expect(userliteUtilitiesElement).toExist();
                userliteUtilitiesPanel = atom.workspace.panelForItem(userliteUtilitiesElement);
                expect(userliteUtilitiesPanel.isVisible()).toBe(true);
                atom.commands.dispatch(workspaceElement, 'userlite-utilities:ulURL');
                return expect(userliteUtilitiesPanel.isVisible()).toBe(false);
            });
        });
        return it("hides and shows the view", function() {
            jasmine.attachToDOM(workspaceElement);
            expect(workspaceElement.querySelector('.userlite-utilities')).not.toExist();
            atom.commands.dispatch(workspaceElement, 'userlite-utilities:ulURL');
            waitsForPromise(function() {
                return activationPromise;
            });
            return runs(function() {
                var userliteUtilitiesElement;
                userliteUtilitiesElement = workspaceElement.querySelector('.userlite-utilities');
                expect(userliteUtilitiesElement).toBeVisible();
                atom.commands.dispatch(workspaceElement, 'userlite-utilities:ulURL');
                return expect(userliteUtilitiesElement).not.toBeVisible();
            });
        });
    });
});
