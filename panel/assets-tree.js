(() => {
  'use strict';

  const Url = require('fire-url');
  const Path = require('fire-path');

  function _getNameCollisions(itemELs, list) {
    let collisions = [];

    for (let i = 0; i < list.length; i++) {
      let name = list[i];

      for (let j = 0; j < itemELs.length; j++) {

        let node = itemELs[j];
        if ( node.name + node.extname === name ) {
          collisions.push(node);
        }

      }
    }

    return collisions;
  }

  Editor.registerElement({
    behaviors: [EditorUI.focusable, EditorUI.droppable, EditorUI.idtree],

    listeners: {
      'focus': '_onFocus',
      'blur': '_onBlur',
      'mousedown': '_onMouseDown',
      'contextmenu': '_onContextMenu',
      'dragstart': '_onDragStart',
      'dragend': '_onDragEnd',
      'dragover': '_onDragOver',
      'drop-area-enter': '_onDropAreaEnter',
      'drop-area-leave': '_onDropAreaLeave',
      'drop-area-accept': '_onDropAreaAccept',
      'item-selecting': '_onItemSelecting',
      'item-select': '_onItemSelect',
      'item-name-click': '_onItemNameClick',
      'icon-hover-in': '_onIconHoverIn',
      'icon-hover-out': '_onIconHoverOut',
    },

    properties: {
    },

    ready () {
      this._shiftStartElement = null;
      this._conflictElements = [];

      this._initFocusable(this);
      this._initDroppable(this);
    },

    refresh () {
      this.clear();

      this.fire('start-loading',1);
      Editor.assetdb.deepQuery(results => {
        this._build(results);
        this.fire('finish-loading');
        this.fire('assets-tree-ready');
      });
    },

    validate (name, pattern) {
      return name.toLowerCase().indexOf(pattern.toLowerCase()) > -1 ;
    },

    search ( pattern ) {
      if (!pattern) {
        return;
      }
      this.cancelAsync(this._asyncID);
      this._asyncID = null;

      this.fire('start-loading',100);
      let id = this.async(() => {
        this.fire('finish-loading');
        Editor.assetdb.queryAssets('db://assets/**/*', null, results => {
          this.clear();
          if (id !== this._asyncID) {
            return;
          }

          let text = pattern.toLowerCase();
          results.forEach(info => {

            let name = Path.basenameNoExt(info.path);
            let extname = Path.extname(info.path);
            if ( this.validate(name, text) ) {
              let newEL = document.createElement('assets-item');

              this.addItem(this, newEL, {
                id: info.uuid,
                name: name,
                extname: extname,
                folded: false,
                assetType: info.type,
                isSubAsset: info.isSubAsset
              });
              newEL.setIcon(info.type);
            }
          });

          let selection = Editor.Selection.curSelection('asset');
          selection.forEach(id => {
            this.selectItemById(id);
          });
          this.activeItemById(Editor.Selection.curActivate('asset'));
        });

      }, 50);

      this._asyncID = id;
    },

    rename ( element ) {
      this.hidePreview();

      let treeBCR = this.getBoundingClientRect();
      let elBCR = element.getBoundingClientRect();
      let offsetTop = elBCR.top - treeBCR.top - 1;
      let offsetLeft = elBCR.left - treeBCR.left + 27 - 4;

      this.$.nameInput.style.top = (this.$.content.scrollTop + offsetTop) + 'px';
      this.$.nameInput.style.left = offsetLeft + 'px';
      this.$.nameInput.style.width = 'calc(100% - ' + offsetLeft + 'px)';

      this.$.nameInput.hidden = false;
      this.$.nameInput.value = element.name;
      this.$.nameInput.focus();
      this.$.nameInput._renamingEL = element;
      window.requestAnimationFrame(() => {
        this.$.nameInput.select();
      });
    },

    select ( itemEL ) {
      Editor.Selection.select( 'asset', itemEL._userId, true, true );
    },

    clearSelection () {
      Editor.Selection.clear('asset');
      this._activeElement = null;
      this._shiftStartElement = null;
    },

    selectPrev ( shiftSelect ) {
      if ( !this._activeElement ) {
        return;
      }

      let prev = this.prevItem(this._activeElement);
      if ( !prev ) {
        return;
      }

      if (prev === this._activeElement) {
        return;
      }

      this.hidePreview();

      if ( shiftSelect ) {
        if (this._shiftStartElement === null) {
          this._shiftStartElement = this._activeElement;
        }

        let userIds = this._getShiftSelects(prev);
        Editor.Selection.select( 'asset', userIds, true, true );
      } else {
        this._shiftStartElement = null;
        Editor.Selection.select( 'asset', prev._userId, true, true );
      }

      this.activeItem(prev);

      window.requestAnimationFrame(() => {
        if ( prev.offsetTop <= this.$.content.scrollTop ) {
          this.$.content.scrollTop = prev.offsetTop - 2; // 1 for padding, 1 for border
        }
      });
    },

    selectNext ( shiftSelect ) {
      if ( !this._activeElement ) {
        return;
      }

      let next = this.nextItem(this._activeElement, false);
      if ( !next ) {
        return;
      }

      if ( next === this._activeElement ) {
        return;
      }

      this.hidePreview();

      if ( shiftSelect ) {
        if (this._shiftStartElement === null) {
          this._shiftStartElement = this._activeElement;
        }

        let userIds = this._getShiftSelects(next);
        Editor.Selection.select( 'asset', userIds, true, true );
      } else {
        this._shiftStartElement = null;
        Editor.Selection.select( 'asset', next._userId, true, true );
      }

      this.activeItem(next);

      window.requestAnimationFrame(() => {
        let headerHeight = next.$.header.offsetHeight;
        let contentHeight = this.offsetHeight - 3; // 2 for border, 1 for padding
        if ( next.offsetTop + headerHeight >= this.$.content.scrollTop + contentHeight ) {
          this.$.content.scrollTop = next.offsetTop + headerHeight - contentHeight;
        }
      });
    },

    getUrl ( element ) {
      let url = element.name + element.extname;
      let parentEL = Polymer.dom(element).parentNode;
      while (parentEL.tagName === 'ASSETS-ITEM' ) {
        url = Url.join(parentEL.name + parentEL.extname, url);
        parentEL = Polymer.dom(parentEL).parentNode;
      }

      url = 'db://' + url;
      return url;
    },

    moveItemById ( id, parentID, name ) {
      let srcEL = this._id2el[id];
      if ( !srcEL ) {
        Editor.warn('Can not find source element by id: %s', id);
        return;
      }

      // rename it first
      srcEL.name = name;

      // insert it
      this.setItemParentById(id, parentID);

      // expand parent
      let parentEL = this._id2el[parentID];
      if ( parentEL && parentEL.foldable ) {
        parentEL.folded = false;
      }
    },

    addNewItemById ( uuid, parentID, opts ) {
      let parentEL = this._id2el[parentID];
      let newEL = document.createElement('assets-item');

      this.addItem( parentEL, newEL, {
        id: uuid,
        name: opts.name,
        extname: opts.extname,
        assetType: opts.assetType,
        isSubAsset: opts.isSubAsset,
      });
      newEL.setIcon( opts.assetType );
    },

    hintItemById ( uuid ) {
      let itemEL = this._id2el[uuid];
      if ( !itemEL ) {
        return;
      }

      if ( this._canUseParent(itemEL) ) {
        let parentEL = Polymer.dom(itemEL).parentNode;
        if ( parentEL.folded ) {
          itemEL = parentEL;
        }
      }

      if (itemEL) {
        this.expand( itemEL._userId, true );
        this.scrollToItem(itemEL);
        itemEL.hint();
      }
    },

    showPreviewAfter ( element, ms ) {
      if ( element.assetType !== 'texture' ) {
        return;
      }

      clearTimeout(this._previewID);

      this._previewID = setTimeout(() => {
        this._previewID = null;

        // let offsetX = element.offsetLeft - element.offsetParent.scrollLeft;
        // let offsetY = element.offsetTop - element.offsetParent.scrollTop;

        let w = 150;
        let h = 150;
        let iconOffset = EditorUI.offsetTo( element.$.icon, element.offsetParent );
        let left = iconOffset.x + element.$.icon.clientWidth - w/2;
        if ( left < 0 ) {
          left = 10;
        }
        if ( left + w > element.offsetParent.clientWidth ) {
          left = element.offsetParent.clientWidth - w - 10;
        }

        let top = element.offsetTop - h - 10;
        if ( top - element.offsetParent.scrollTop < 0 ) {
          top = element.offsetTop + element.$.bar.offsetHeight + 10;
        }

        this.$.preview.hidden = false;
        this.$.preview.style.left = `${left}px`;
        this.$.preview.style.top = `${top}px`;
        this.$.preview.style.width = `${w}px`;
        this.$.preview.style.height = `${h}px`;

        this.$.preview.style.backgroundImage = `url("uuid://${element._userId}")`;
      }, ms);
    },

    hidePreview () {
      clearTimeout(this._previewID);
      this._previewID = null;
      this.$.preview.hidden = true;
    },

    _build ( data ) {
      console.time('assets-tree._build()');
      data.forEach(entry => {
        let parentEL;
        if ( entry.parentUuid ) {
          parentEL = this._id2el[entry.parentUuid];
        } else {
          parentEL = this;
        }

        if ( !parentEL ) {
          // NOTE: do not warn it, the parent could be a hidden mount
          // console.warn(`Failed to add item ${entry.name}, parent not found.`);
          return;
        }

        // check if visible
        let visible = !entry.hidden;
        if ( entry.type === 'mount' && Editor.showInternalMount ) {
          visible = true;
        }

        //
        if ( visible ) {
          let newEL = document.createElement('assets-item');
          this.addItem(parentEL, newEL, {
            id: entry.uuid,
            folded: entry.type === 'mount' ? false : true,
            name: entry.name,
            extname: entry.extname,
            assetType: entry.type,
            isSubAsset: entry.isSubAsset,
          });
          newEL.setIcon( entry.type );
        }

      });
      console.timeEnd('assets-tree._build()');
    },

    _getShiftSelects ( targetEL ) {
      let el = this._shiftStartElement;
      let userIds = [];

      if (this._shiftStartElement !== targetEL) {
        if (this._shiftStartElement.offsetTop < targetEL.offsetTop) {
          while (el !== targetEL) {
            userIds.push(el._userId);
            el = this.nextItem(el);
          }
        } else {
          while (el !== targetEL) {
            userIds.push(el._userId);
            el = this.prevItem(el);
          }
        }
      }
      userIds.push(targetEL._userId);

      return userIds;
    },

    // events

    _onItemSelecting ( event ) {
      event.stopPropagation();

      let targetEL = event.target;
      let shiftStartEL = this._shiftStartElement;
      this._shiftStartElement = null;

      if (event.detail.shift) {
        if (shiftStartEL === null) {
          this._shiftStartElement = this._activeElement;
        } else {
          this._shiftStartElement = shiftStartEL;
        }

        let userIds = this._getShiftSelects(targetEL);
        Editor.Selection.select( 'asset', userIds, true, false );
      } else if ( event.detail.toggle ) {
        if ( targetEL.selected ) {
          Editor.Selection.unselect('asset', targetEL._userId, false);
        } else {
          Editor.Selection.select('asset', targetEL._userId, false, false);
        }
      } else {
        // if target already selected, do not unselect others
        if ( !targetEL.selected ) {
          Editor.Selection.select('asset', targetEL._userId, true, false);
        }
      }
    },

    _onItemSelect ( event ) {
      event.stopPropagation();

      if ( event.detail.shift ) {
        Editor.Selection.confirm();
      } else if ( event.detail.toggle ) {
        Editor.Selection.confirm();
      } else {
        Editor.Selection.select( 'asset', event.target._userId, true );
      }
    },

    _onItemNameClick ( event ) {
      event.stopPropagation();

      let selection = Editor.Selection.curSelection('asset');
      let el = event.target;
      if (
        Editor.Selection.confirmed('asset') &&
        selection.length === 1 &&
        selection[0] === el._userId
      ) {
        setTimeout(() => {
          this.rename(el);
        }, 300);
      }
    },

    _onIconHoverIn ( event ) {
      event.stopPropagation();
      this.showPreviewAfter(event.target,300);
    },

    _onIconHoverOut ( event ) {
      event.stopPropagation();
      this.hidePreview();
    },

    _onMouseDown ( event ) {
      if ( event.which !== 1 ) {
        return;
      }

      event.stopPropagation();
      this.clearSelection();
    },

    _onContextMenu ( event ) {
      event.preventDefault();
      event.stopPropagation();

      let contextEL = Polymer.dom(event).localTarget;
      Editor.Selection.setContext('asset',contextEL._userId);

      Editor.sendToCore(
        'assets:popup-context-menu',
        event.clientX,
        event.clientY,
        Editor.requireIpcEvent
      );
    },

    _onScroll () {
      this.hidePreview();

      this.$.content.scrollLeft = 0;
    },

    // drag & drop events

    _onDragStart ( event ) {
      this.hidePreview();

      event.stopPropagation();

      let selection = Editor.Selection.curSelection('asset');
      EditorUI.DragDrop.start(
        event.dataTransfer,
        'copyMove',
        'asset',
        selection.map(uuid => {
          let itemEL = this._id2el[uuid];
          return {
            id: uuid,
            name: itemEL.name,
            icon: itemEL.$.icon,
          };
        })
      );
    },

    _onDragEnd () {
      EditorUI.DragDrop.end();

      Editor.Selection.cancel();
      this._cancelHighligting();
      this._curInsertParentEL = null;
    },

    _onDragOver ( event ) {
      let dragType = EditorUI.DragDrop.type(event.dataTransfer);
      if ( dragType !== 'node' && dragType !== 'asset' && dragType !== 'file' ) {
        EditorUI.DragDrop.allowDrop( event.dataTransfer, false );
        return;
      }

      //
      event.preventDefault();
      event.stopPropagation();

      //
      if ( event.target ) {
        let dragoverEL = Polymer.dom(event).localTarget;
        let insertParentEL = dragoverEL;
        let thisDOM = Polymer.dom(this);

        // NOTE: invalid assets browser, no mount in it
        if ( thisDOM.children.length === 0 ) {
          return;
        }

        // get drag over target
        if ( insertParentEL === this ) {
          insertParentEL = thisDOM.firstElementChild;
        }
        if ( !insertParentEL.canAddChild() ) {
          insertParentEL = Polymer.dom(insertParentEL).parentNode;
        }

        // do conflict check if we last dragover is not the same
        if ( insertParentEL !== this._curInsertParentEL ) {
          this._cancelHighligting();
          this._curInsertParentEL = insertParentEL;

          this._highlightBorder( insertParentEL );

          // name collision check
          let names = [];
          let dragItems = EditorUI.DragDrop.items(event.dataTransfer);

          if (dragType === 'file') {
            for (let i = 0; i < dragItems.length; i++) {
              names.push(Path.basename(dragItems[i]));
            }
          } else if (dragType === 'asset') {
            let srcELs = this.getToplevelElements(dragItems);
            for (let i = 0; i < srcELs.length; i++) {
              let srcEL = srcELs[i];
              if (insertParentEL !== Polymer.dom(srcEL).parentNode) {
                names.push(srcEL.name + srcEL.extname);
              }
            }
          }

          // check if we have conflicts names
          let valid = true;
          if (names.length > 0) {
            let resultELs = _getNameCollisions( Polymer.dom(insertParentEL).children, names);
            if (resultELs.length > 0) {
              this._highlightConflicts(resultELs);
              valid = false;
            }
          }
          EditorUI.DragDrop.allowDrop(event.dataTransfer, valid);
        }

        // highlight insert
        let bcr = this.getBoundingClientRect();
        let offsetY = event.clientY - bcr.top + this.$.content.scrollTop;
        let position = 'before';
        if (offsetY >= (dragoverEL.offsetTop + dragoverEL.offsetHeight * 0.5)) {
          position = 'after';
        }
        this._highlightInsert(dragoverEL, insertParentEL, position);
      }

      //
      let dropEffect = 'none';
      if ( dragType === 'node' || dragType === 'file' ) {
        dropEffect = 'copy';
      } else if ( dragType === 'asset' ) {
        dropEffect = 'move';
      }
      EditorUI.DragDrop.updateDropEffect(event.dataTransfer, dropEffect);
    },

    _onDropAreaEnter ( event ) {
      event.stopPropagation();
    },

    _onDropAreaLeave ( event ) {
      event.stopPropagation();

      this._cancelHighligting();
      this._curInsertParentEL = null;
    },

    _onDropAreaAccept ( event ) {
      event.stopPropagation();
      let targetEL = this._curInsertParentEL;

      Editor.Selection.cancel();
      this._cancelHighligting();
      this._curInsertParentEL = null;

      //
      if ( event.detail.dragItems.length === 0 ) {
        return;
      }

      let dragItems = event.detail.dragItems;
      let destUrl = this.getUrl(targetEL);

      // process drop
      if ( event.detail.dragType === 'node' ) {
        let id = dragItems[0];
        Editor.sendToPanel('scene.panel', 'scene:create-prefab', id, destUrl);
      } else if ( event.detail.dragType === 'asset' ) {
        if ( targetEL ) {
          let srcELs = this.getToplevelElements(dragItems);

          for (let i = 0; i < srcELs.length; ++i) {
            let srcEL = srcELs[i];

            // do nothing if we already here
            if (
              srcEL === targetEL ||
              Polymer.dom(srcEL).parentNode === targetEL
            ) {
              continue;
            }

            if ( srcEL.contains(targetEL) === false ) {
              let srcUrl = this.getUrl(srcEL);
              Editor.assetdb.move( srcUrl, Url.join(destUrl, Url.basename(srcUrl) ), true );
            }
          }
        }
      } else if ( event.detail.dragType === 'file' ) {
        if ( targetEL ) {
          Editor.assetdb.import( dragItems, destUrl );
        }
      }
    },

    // rename events

    _onRenameMouseDown ( event ) {
      event.stopPropagation();
    },

    _onRenameKeyDown ( event ) {
      event.stopPropagation();
    },

    _onRenameValueChanged () {
      let targetEL = this.$.nameInput._renamingEL;
      if ( targetEL ) {
        let srcUrl = this.getUrl(targetEL);
        let destUrl = Url.join(Url.dirname(srcUrl), this.$.nameInput.value + targetEL.extname);
        Editor.assetdb.move( srcUrl, destUrl, true );

        this.$.nameInput._renamingEL = null;
        this.$.nameInput.hidden = true;
      }
    },

    _onRenameFocusChanged ( event ) {
      if ( !this.$.nameInput._renamingEL ) {
        return;
      }

      this._renameFocused = event.detail.value;

      // NOTE: it is possible user mouse click on rename input,
      // which change the focused to false and then true again.
      setTimeout(() => {
        if ( !this._renameFocused ) {
          this.$.nameInput._renamingEL = null;
          this.$.nameInput.hidden = true;
        }
      },1);
    },

    // highlighting

    _highlightBorder ( itemEL ) {
      if ( itemEL && itemEL.tagName === 'ASSETS-ITEM' ) {
        let style = this.$.highlightBorder.style;
        style.display = 'block';
        style.left = (itemEL.offsetLeft-2) + 'px';
        style.top = (itemEL.offsetTop-1) + 'px';
        style.width = (itemEL.offsetWidth+4) + 'px';
        style.height = (itemEL.offsetHeight+3) + 'px';

        itemEL.highlighted = true;
      } else {
        this.$.highlightBorder.style.display = 'none';
      }
    },

    _highlightInsert ( itemEL, parentEL, position ) {
      let style = this.$.insertLine.style;
      if (itemEL === this) {
        itemEL = this.firstChild;
      }

      if (itemEL === parentEL) {
        style.display = 'none';
      } else if (itemEL && parentEL) {
        style.display = 'block';

        style.left = parentEL.offsetLeft + 'px';
        if (position === 'before') {
          style.top = (itemEL.offsetTop) + 'px';
        } else {
          style.top = (itemEL.offsetTop + itemEL.offsetHeight) + 'px';
        }

        style.width = parentEL.offsetWidth + 'px';
        style.height = '0px';
      }
    },

    _highlightConflicts ( itemELs ) {
      for (let i = 0; i < itemELs.length; ++i) {
        let itemEL = itemELs[i];
        if ( itemEL.conflicted === false ) {
          itemEL.conflicted = true;
          this._conflictElements.push(itemEL);
        }
      }

      if (this._curInsertParentEL) {
        this._curInsertParentEL.invalid = true;
      }

      this.$.highlightBorder.setAttribute('invalid', '');
    },

    _cancelHighligting () {
      this.$.highlightBorder.style.display = 'none';
      this.$.highlightBorder.removeAttribute('invalid');

      this.$.insertLine.style.display = 'none';

      if (this._curInsertParentEL) {
        this._curInsertParentEL.highlighted = false;
        this._curInsertParentEL.invalid = false;
      }

      this._conflictElements.forEach(el => {
        el.conflicted = false;
      });
      this._conflictElements = [];
    },

    _canUseParent ( el ) {
      let parentEL = Polymer.dom(el).parentNode;
      let parentDOM = Polymer.dom(parentEL);
      if ( el.isSubAsset && parentDOM.children[0] === el && el.name === parentEL.name ) {
        return true;
      }

      return false;
    },
  });

})();
