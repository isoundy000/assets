(function () {
  'use strict';

  const Url = require('fire-url');
  const Path = require('fire-path');
  const Fs = require('fire-fs');

  Editor.registerPanel( 'assets.panel', {
    properties: {
      activeItemUrl: {
        type: String,
        value: '',
      },

      searchPattern: {
        type: String,
        value: '',
        observer: '_onSearchPatternChanged'
      },
    },

    listeners: {
      'assets-tree-ready': '_onAssetsTreeReady',
      'open-asset': '_onOpenAsset',
      'start-loading': '_onStartLoading',
      'finish-loading': '_onFinishLoading',
    },

    'panel-ready' () {
      this._activeWhenCreated = null;

      window.addEventListener('beforeunload', () => {
        let states = this.$.tree.dumpItemStates();
        this.profiles.local['item-states'] = states;
        this.profiles.local.save();

        // NOTE: this will prevent window reload
        // event.returnValue = false;
      });

      this.$.tree.refresh();
    },

    focusOnSearch ( event ) {
      if ( event ) {
        event.stopPropagation();
      }

      this.$.search.setFocus();
    },

    selectPrev ( event ) {
      if ( event ) {
        event.stopPropagation();
        event.preventDefault();
      }

      this.curView().selectPrev(false);
    },

    selectNext ( event ) {
      if ( event ) {
        event.stopPropagation();
        event.preventDefault();
      }

      this.curView().selectNext(false);
    },

    shiftSelectPrev ( event ) {
      if ( event ) {
        event.stopPropagation();
        event.preventDefault();
      }

      this.curView().selectPrev(true);
    },

    shiftSelectNext ( event ) {
      if ( event ) {
        event.stopPropagation();
        event.preventDefault();
      }

      this.curView().selectNext(true);
    },

    foldCurrent ( event ) {
      if ( event ) {
        event.stopPropagation();
        event.preventDefault();
      }

      let activeEL = this.$.tree._activeElement;
      if ( activeEL && activeEL.foldable && !activeEL.folded ) {
        activeEL.folded = true;
      }
    },

    foldupCurrent ( event ) {
      if ( event ) {
        event.stopPropagation();
        event.preventDefault();
      }

      let activeEL = this.$.tree._activeElement;
      if ( activeEL && activeEL.foldable && activeEL.folded ) {
        activeEL.folded = false;
      }
    },

    renameCurrentSelected ( event ) {
      if ( event ) {
        event.stopPropagation();
        event.preventDefault();
      }

      if ( this.curView()._activeElement ) {
        this.curView().rename(this.curView()._activeElement);
      }
    },

    deleteCurrentSelected ( event ) {
      if ( event ) {
        event.stopPropagation();
        event.preventDefault();
      }

      let ids = Editor.Selection.curSelection('asset');
      let urls = ids.map(id => {
        let el = this.curView()._id2el[id];
        return this.curView().getUrl(el);
      });

      let msg = urls;
      if ( msg.length > 3 ) {
        msg = msg.slice(0,3);
        msg.push('...');
      }
      msg = msg.join('\n');

      let result = Editor.Dialog.messageBox({
        type: 'warning',
        buttons: ['Delete','Cancel'],
        title: 'Delete selected asset?',
        message: msg,
        detail: 'Your cannot undo this action.'
      });

      if ( result === 0 ) {
        Editor.assetdb.delete(urls);
      }
    },

    curView () {
      if (!this.$.searchResult.hidden) {
        return this.$.searchResult;
      }
      return this.$.tree;
    },

    'selection:selected' ( type, ids ) {
      if ( type !== 'asset' ) {
        return;
      }

      ids.forEach(id => {
        this.$.tree.selectItemById(id);
        if (!this.$.searchResult.hidden) {
          this.$.searchResult.selectItemById(id);
        }
      });
    },

    'selection:unselected' ( type, ids ) {
      if ( type !== 'asset' ) {
        return;
      }

      ids.forEach(id => {
        this.$.tree.unselectItemById(id);
        if (!this.$.searchResult.hidden) {
          this.$.searchResult.unselectItemById(id);
        }
      });
    },

    'selection:activated' ( type, id ) {
      if ( type !== 'asset' ) {
        return;
      }

      if ( !id ) {
        return;
      }

      this.curView().activeItemById(id);
      this.activeItemUrl = this.curView().getUrl(this.curView()._activeElement);
    },

    'selection:deactivated' ( type, id ) {
      if ( type !== 'asset' ) {
        return;
      }

      this.curView().deactiveItemById(id);
    },

    'asset-db:assets-created' ( results ) {
      let hintResults = [];

      results.forEach(result => {
        let baseNameNoExt = Path.basenameNoExt(result.path);
        this.$.tree.addNewItemById( result.uuid, result.parentUuid, {
          name: baseNameNoExt,
          extname: Path.extname(result.path),
          assetType: result.type,
          isSubAsset: result.isSubAsset,
        });

        if ( this._activeWhenCreated === result.url ) {
          this._activeWhenCreated = null;
          Editor.Selection.select('asset', result.uuid);
        }

        if ( !this.$.searchResult.hidden ) {
          if ( this.$.searchResult.validate( baseNameNoExt, this.searchPattern) ) {
            let newEL = document.createElement('assets-item');
            this.$.searchResult.addItem(this.curView(), newEL, {
              id: result.uuid,
              name: baseNameNoExt,
              assetType: result.type,
              extname: Path.extname(result.path),
              isSubAsset: result.isSubAsset,
            });
            newEL.setIcon( result.type );
            hintResults.push(result);
          }
        } else {
          let foundParentInResults = results.some(result2 => {
            return result2.uuid === result.parentUuid;
          });
          if ( !foundParentInResults ) {
            hintResults.push(result);
          }
        }
      });

      let curView = this.curView();
      hintResults.forEach(result => {
        window.requestAnimationFrame(() => {
          let itemEL = curView._id2el[result.uuid];
          itemEL.hint();
          let parentEL = curView._id2el[result.parentUuid];
          if (parentEL) {
            parentEL.folded = false;
          }
        });
      });

      if ( hintResults.length ) {
        let firstResult = hintResults[0];
        let itemEL = curView._id2el[firstResult.uuid];
        curView.scrollToItem(itemEL);
      }
    },

    'asset-db:assets-moved' ( results ) {
      let filterResults = Editor.Utils.arrayCmpFilter ( results, (a, b) => {
        if ( Path.contains( a.srcPath, b.srcPath ) ) {
          return 1;
        }
        if ( Path.contains( b.srcPath, a.srcPath ) ) {
          return -1;
        }
        return 0;
      });

      filterResults.forEach(result => {
        this.$.tree.moveItemById(
          result.uuid,
          result.parentUuid,
          Path.basenameNoExt(result.destPath)
        );

        if (!this.$.searchResult.hidden) {
          this.$.searchResult.moveItemById(
            result.uuid,
            result.parentUuid,
            Path.basenameNoExt(result.destPath)
          );
        }
      });

      // flash moved
      filterResults.forEach(result => {
        window.requestAnimationFrame(() => {
          let itemEL = this.curView()._id2el[result.uuid];
          itemEL.hint();
        });
      });
    },

    'asset-db:assets-deleted' ( results ) {
      // var filterResults = Editor.Utils.arrayCmpFilter ( results, function ( a, b ) {
      //   if ( Path.contains( a.path, b.path ) ) {
      //     return 1;
      //   }
      //   if ( Path.contains( b.path, a.path ) ) {
      //     return -1;
      //   }
      //   return 0;
      // });

      results.forEach(result => {
        this.$.tree.removeItemById( result.uuid );
        if (!this.$.searchResult.hidden) {
          this.$.searchResult.removeItemById( result.uuid );
        }
      });

      let uuids = results.map(result => {
        return result.uuid;
      });
      Editor.Selection.unselect('asset', uuids, true);
    },

    'asset-db:asset-changed' ( result ) {
      let itemEL = this.curView()._id2el[result.uuid];
      itemEL.hint();
    },

    'asset-db:asset-uuid-changed' ( result ) {
      let itemEL = this.curView()._id2el[result.oldUuid];
      this.curView().updateItemID(itemEL, result.uuid);
      itemEL.hint();
    },

    'assets:hint' ( uuid ) {
      this.curView().hintItemById(uuid);
    },

    'assets:new-asset' ( info, isContextMenu ) {
      // get parent url
      let url, el, parentUrl;
      if ( isContextMenu ) {
        let contextUuids = Editor.Selection.contexts('asset');

        if ( contextUuids.length > 0 ) {
          let contextUuid = contextUuids[0];
          el = this.curView()._id2el[contextUuid];

          if ( el.assetType === 'folder' || el.assetType === 'mount' ) {
            parentUrl = this.curView().getUrl(el);
          } else {
            url = this.curView().getUrl(el);
            parentUrl = Path.dirname(url);
          }
        } else {
          el = Polymer.dom(this.curView()).firstElementChild;
          parentUrl = this.curView().getUrl(el);
        }
      } else {
        let uuid = Editor.Selection.curActivate('asset');
        if ( uuid ) {
          el = this.curView()._id2el[uuid];
          url = this.curView().getUrl(el);

          // if this is not root
          if ( Polymer.dom(el).parentNode !== this.curView() ) {
            parentUrl = Path.dirname(url);
          } else {
            parentUrl = url;
          }
        } else {
          el = Polymer.dom(this.curView()).firstElementChild;
          parentUrl = this.curView().getUrl(el);
        }
      }

      //
      let data = info.data;
      if ( info.url ) {
        data = Fs.readFileSync(Editor.url(info.url), {encoding:'utf8'});
      }

      let assetUrl = Url.join(parentUrl, info.name);
      this._activeWhenCreated = assetUrl;
      Editor.assetdb.create( assetUrl, data );
    },

    'assets:rename' ( uuid ) {
      let el = this.curView()._id2el[uuid];
      if ( el ) {
        this.curView().rename(el);
      }
    },

    'assets:delete' ( uuids ) {
      let urls = uuids.map(id => {
        let el = this.curView()._id2el[id];
        return this.curView().getUrl(el);
      });
      Editor.assetdb.delete(urls);
    },

    _onStartLoading ( event ) {
      if (this.$.loader.hidden === false) {
        return;
      }

      if (this._loaderID) {
        return;
      }

      this._loaderID = this.async(() => {
        this.$.loader.hidden = false;
        this._loaderID = null;
      }, event.detail);
    },

    _onFinishLoading () {
      this.cancelAsync(this._loaderID);
      this._loaderID = null;
      this.$.loader.hidden = true;
    },

    _onAssetsTreeReady () {
      let localProfile = this.profiles.local;
      this.$.tree.restoreItemStates(localProfile['item-states']);

      // sync the selection
      let selection = Editor.Selection.curSelection('asset');
      selection.forEach(id => {
        this.$.tree.selectItemById(id);
      });

      let curActivate = Editor.Selection.curActivate('asset');
      if ( curActivate ) {
        this.$.tree.activeItemById(curActivate);
        this.activeItemUrl = this.curView().getUrl(this.curView()._activeElement);
      }
    },

    _onOpenAsset ( event ) {
      let uuid = event.detail.uuid;
      Editor.assetdb.queryInfoByUuid( uuid, info => {
        let assetType = info.type;
        if ( assetType === 'javascript' || assetType === 'coffeescript' ) {
          Editor.sendToCore('code-editor:open-by-uuid', uuid);
        } else if ( assetType === 'scene' ) {
          Editor.sendToCore('scene:open-by-uuid', uuid);
        }
      });
    },

    _onRefresh ( event ) {
      event.stopPropagation();
      this.$.tree.refresh();
    },

    _onCreateClick () {
      let rect = this.$.createBtn.getBoundingClientRect();
      Editor.sendToCore(
        'assets:popup-create-menu',
        rect.left,
        rect.bottom + 5,
        Editor.requireIpcEvent
      );
    },

    _onSearchPatternChanged () {
      this.$.searchResult.search(this.searchPattern);

      if (this.searchPattern) {
        this.$.searchResult.hidden = false;
        this.$.locate.hidden = false;
        this.$.tree.hidden = true;

        return;
      }

      this.$.searchResult.hidden = true;
      this.$.locate.hidden = true;
      this.$.searchResult.clear();
      this.$.tree.hidden = false;
    },

    _onLocateClick (event) {
      event.stopPropagation();

      let ids = Editor.Selection.curSelection('asset');
      let locateItem = false;
      ids.forEach(item => {
        if (this.$.searchResult._id2el[item]) {
          locateItem = true;
          return;
        }
        locateItem = false;
      });

      if (!locateItem) {
        return;
      }

      this.searchPattern = '';
      this.$.tree.hintItemById(ids[0]);

      for (let i = 1; i < ids.length; ++i) {
        this.$.tree._id2el[ids[i]].hint();
      }
    },

    _onSearchConfirm ( event ) {
      if ( event.detail.confirmByEnter ) {
        this.async(() => {
          if ( !this.$.searchResult.hidden ) {
            this.$.searchResult.setFocus();

            return;
          }

          this.$.tree.setFocus();
        });
      }
    },
  });

})();
