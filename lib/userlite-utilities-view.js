var UserliteUtilitiesView;

module.exports = UserliteUtilitiesView = (function() {
    function UserliteUtilitiesView(serializedState) {
        var message;
        this.element = document.createElement('div');
        this.element.classList.add('userlite-utilities');
        message = document.createElement('div');
        message.textContent = "The UserliteUtilities package is Alive! It's ALIVE!";
        message.classList.add('message');
        this.element.appendChild(message);
    }

    UserliteUtilitiesView.prototype.serialize = function() {};

    UserliteUtilitiesView.prototype.destroy = function() {
        return this.element.remove();
    };

    UserliteUtilitiesView.prototype.getElement = function() {
        return this.element;
    };

    return UserliteUtilitiesView;

})();
