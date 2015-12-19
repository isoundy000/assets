(() => {
  'use strict';

  function _binaryIndexOf ( elements, key ) {
    let lo = 0;
    let hi = elements.length - 1;
    let mid;

    while (lo <= hi) {
      mid = ((lo + hi) >> 1);
      let name = elements[mid].name + elements[mid].type;

      if (name < key) {
        lo = mid + 1;
      } else if (name > key) {
        hi = mid - 1;
      } else {
        return mid;
      }
    }

    return lo;
  }

  function _binaryInsert ( parentEL, el ) {
    let parentDOM = Polymer.dom(parentEL);

    let idx = _binaryIndexOf( parentDOM.children, el.name + el.type );
    if ( idx === -1 ) {
      parentDOM.appendChild(el);
    } else {
      if ( el !== parentDOM.children[idx] ) {
        parentDOM.insertBefore(el, parentDOM.children[idx]);
      }
    }
  }

  Editor.registerElement({
    hostAttributes: {
      draggable: 'true',
    },

    properties: {
      // basic

      foldable: {
        type: Boolean,
        value: false,
        notify: true,
        reflectToAttribute: true,
      },

      folded: {
        type: Boolean,
        value: false,
        notify: true,
        reflectToAttribute: true,
      },

      selected: {
        type: Boolean,
        value: false,
        notify: true,
        reflectToAttribute: true,
      },

      name: {
        type: String,
        value: '',
      },

      // advance

      extname: {
        type: String,
        value: '',
      },

      assetType: {
        type: String,
        value: '',
      },

      conflicted: {
        type: Boolean,
        value: false,
        reflectToAttribute: true
      },

      highlighted: {
        type: Boolean,
        value: false,
        reflectToAttribute: true
      },

      invalid: {
        type: Boolean,
        value: false,
        reflectToAttribute: true
      },
    },

    listeners: {
      'mousedown': '_onMouseDown',
      'click': '_onClick',
      'dblclick': '_onDblClick',
    },

    ready () {
      this._renaming = false;
      this._userId = '';
    },

    //
    setIcon ( type ) {
      let url;

      if ( type === 'texture' ) {
        url = `thumbnail://${this._userId}?32`;
        this.$.icon.style.backgroundImage = 'url("' + url + '")';
        return;
      }

      let metaCtor = Editor.metas[type];
      if ( metaCtor && metaCtor['asset-icon'] ) {
        url = metaCtor['asset-icon'];
        this.$.icon.style.backgroundImage = 'url("' + url + '")';
        return;
      }

      // fallback to default icon
      url = 'packages://assets/static/icon/' + type + '.png';
      this.$.icon.style.backgroundImage = 'url("' + url + '")';
    },

    //

    _nameClass ( name ) {
      if ( !name ) {
        return 'no-name';
      }
      return 'name';
    },

    _nameText ( name ) {
      if ( !name ) {
        return 'No Name';
      }
      return name;
    },

    _foldIconClass ( folded ) {
      if ( folded ) {
        return 'fa fa-caret-right';
      }

      return 'fa fa-caret-down';
    },

    // events

    _onMouseDown ( event ) {
      if ( event.which !== 1 ) {
        return;
      }

      event.stopPropagation();

      if ( this._renaming ) {
        return;
      }

      let shift = false;
      let toggle = false;

      if ( event.shiftKey ) {
        shift = true;
      } else if ( event.metaKey || event.ctrlKey ) {
        toggle = true;
      }

      this.fire('item-selecting', {
        toggle: toggle,
        shift: shift,
      });

    },

    _onClick ( event ) {
      if ( event.which !== 1 ) {
        return;
      }

      event.stopPropagation();

      let shift = false;
      let toggle = false;

      if ( event.shiftKey ) {
        shift = true;
      } else if ( event.metaKey || event.ctrlKey ) {
        toggle = true;
      }

      this.fire('item-select', {
        toggle: toggle,
        shift: shift,
      });
    },

    _onDblClick ( event ) {
      if ( event.which !== 1 ) {
        return;
      }

      if ( event.shiftKey || event.metaKey || event.ctrlKey ) {
        return;
      }

      event.stopPropagation();
      this.fire('open-asset', {
        uuid: this._userId
      });
    },

    _onFoldMouseDown ( event ) {
      event.stopPropagation();
    },

    _onFoldClick ( event ) {
      event.stopPropagation();

      if ( event.which !== 1 ) {
        return;
      }

      this.folded = !this.folded;
    },

    _onFoldDblClick ( event ) {
      event.stopPropagation();
    },

    _onIconMouseEnter ( event ) {
      event.stopPropagation();
      this.fire('icon-hover-in');
    },

    _onIconMouseLeave ( event ) {
      event.stopPropagation();
      this.fire('icon-hover-out');
    },

    insertItem ( el ) {
      _binaryInsert( this, el );
    },

    canAddChild () {
      return this.assetType === 'folder' ||
           this.assetType === 'mount'
           // TODO: this.isFolderAsset
           ;
    },

    hint ( color, duration ) {
      color = color || 'white';
      duration = duration || 1000;

      let computedStyle = window.getComputedStyle(this.$.bar);
      this.$.bar.animate([
        { background: color, transform: 'scale(1.2)' },
        { background: computedStyle.backgroundColor, transform: 'scale(1)' }
      ], {
        duration: duration
      });
    },
  });

})();
