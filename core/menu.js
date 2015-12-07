'use strict';

const Shell = require('shell');
const Fs = require('fire-fs');

function getContextTemplate () {
  return [
    {
      label: 'Create',
      submenu: getCreateTemplate(true)
    },

    // ---------------------------------------------
    { type: 'separator' },

    {
      label: 'Rename',
      click () {
        let contextUuids = Editor.Selection.contexts('asset');
        if ( contextUuids.length > 0 ) {
          Editor.sendToPanel('assets.panel', 'assets:rename', contextUuids[0]);
        }
      },
    },

    {
      label: 'Delete',
      click () {
        let contextUuids = Editor.Selection.contexts('asset');
        if ( contextUuids.length > 0 ) {
          Editor.sendToPanel('assets.panel', 'assets:delete', contextUuids);
        }
      },
    },

    // ---------------------------------------------
    { type: 'separator' },

    {
      label: Editor.isDarwin ? 'Reveal in Finder' : 'Show in Explorer',
      click () {
        let contextUuids = Editor.Selection.contexts('asset');
        if ( contextUuids.length > 0 ) {
          let uuid = contextUuids[0];
          let fspath = Editor.assetdb.uuidToFspath(uuid);
          if ( Fs.existsSync(fspath) ) {
            Shell.showItemInFolder(fspath);
          } else {
            Editor.failed( 'Can not found the asset %s', Editor.assetdb.uuidToUrl(uuid) );
          }
        }
      }
    },

    {
      label: Editor.isDarwin ? 'Reveal in Library' : 'Show in Library',
      visible: Editor.isDev,
      click () {
        let contextUuids = Editor.Selection.contexts('asset');
        if ( contextUuids.length > 0 ) {
          let uuid = contextUuids[0];
          let meta = Editor.assetdb.loadMetaByUuid(uuid);

          if ( meta.useRawfile() ) {
            Editor.info( 'This is a raw asset, it does not exists in library' );
            return;
          }

          let dests = meta.dests(Editor.assetdb);
          if ( !dests.length ) {
            Editor.failed( 'The asset %s is not exists in library', Editor.assetdb.uuidToUrl(uuid) );
            return;
          }

          let fspath = dests[0];
          if ( !Fs.existsSync(fspath) ) {
            Editor.failed( 'The asset %s is not exists in library', Editor.assetdb.uuidToUrl(uuid) );
            return;
          }

          Shell.showItemInFolder(fspath);
        }
      }
    },

    {
      label: 'Show UUID',
      visible: Editor.isDev,
      click () {
        let contextUuids = Editor.Selection.contexts('asset');
        if ( contextUuids.length > 0 ) {
          let uuid = contextUuids[0];
          let url = Editor.assetdb.uuidToUrl(uuid);
          Editor.info('%s, %s', uuid, url );
        }
      }
    },

    // ---------------------------------------------
    { type: 'separator' },

    {
      label: 'Refresh',
      click () {
        let contextUuids = Editor.Selection.contexts('asset');
        if ( contextUuids.length > 0 ) {
          let urls = contextUuids.map(uuid => {
            return Editor.assetdb.uuidToUrl(uuid);
          });
          Editor.assetdb.watchOFF();
          urls.forEach(url => {
            // import asset
            Editor.assetdb.refresh ( url, ( err, results ) => {
              if ( err ) {
                Editor.assetdb.error('Failed to import asset %s, %s', url, err.stack);
                return;
              }

              Editor.assetdb._handleRefreshResults(results);
            });
          });
          if ( !Editor.focused ) {
            Editor.assetdb.watchON();
          }
        }
      }
    },
  ];
}

function getCreateTemplate ( isContextMenu ) {
  let menuTmpl = Editor.Menu.getMenu('create-asset');

  // NOTE: this will prevent menu item pollution
  if ( menuTmpl ) {
    menuTmpl = JSON.parse(JSON.stringify(menuTmpl));
    menuTmpl = menuTmpl.map (item => {
      if ( item.params ) {
        item.params.push(isContextMenu);
      }
      return item;
    });
  }

  return [
    {
      label: 'Folder',
      message: 'assets:new-asset',
      params: [
        { name: 'New Folder' },
        isContextMenu
      ]
    },

    // ---------------------------------------------
    { type: 'separator' },
  ].concat(menuTmpl);
}

module.exports = {
  getContextTemplate: getContextTemplate,
  getCreateTemplate: getCreateTemplate,
};
