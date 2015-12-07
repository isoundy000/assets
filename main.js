'use strict';

const BrowserWindow = require('browser-window');
const Menu = require('./core/menu');

module.exports = {
  load () {
  },

  unload () {
  },

  'assets:open' () {
    Editor.Panel.open('assets.panel');
  },

  'assets:popup-create-menu' (event, x, y) {
    var template = Menu.getCreateTemplate();
    var editorMenu = new Editor.Menu(template, event.sender);
    // TODO: editorMenu.add( '', Editor.Menu.getMenu('create-asset') );

    x = Math.floor(x);
    y = Math.floor(y);
    editorMenu.nativeMenu.popup(BrowserWindow.fromWebContents(event.sender), x, y);
    editorMenu.dispose();
  },

  'assets:popup-context-menu' (event, x, y) {
    var template = Menu.getContextTemplate();
    var editorMenu = new Editor.Menu(template, event.sender);
    // TODO: editorMenu.add( '', Editor.Menu.getMenu('create-asset') );

    x = Math.floor(x);
    y = Math.floor(y);
    editorMenu.nativeMenu.popup(BrowserWindow.fromWebContents(event.sender), x, y);
    editorMenu.dispose();
  },
};
