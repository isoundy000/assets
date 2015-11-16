'use strict';

const Uuid = require('node-uuid');

Editor.require('app://editor/test-utils/renderer/init');

let dbData = {
  uuid: 'assets',
  name: 'assets',
  extname: '',
  type: 'mount',

  children: [
    {
      uuid: Uuid.v4(),
      name: 'a folder',
      extname: '',
      type: 'folder',
      children: [
        {
          uuid: Uuid.v4(),
          name: 'foo',
          extname: '.asset',
          type: 'asset',
        },
        {
          uuid: Uuid.v4(),
          name: 'bar',
          extname: '.asset',
          type: 'asset',
        },
      ]
    },
    {
      uuid: Uuid.v4(),
      name: 'foo-bar',
      extname: '.asset',
      type: 'asset',
    },
  ],
};

// stub functions
let deepQuery = sinon.stub( Editor.assetdb, 'deepQuery' );
deepQuery.yields([dbData]);

//
describe('<editor-assets>', function() {
  Helper.runPanel( 'assets.panel' );

  it('should keep running', function ( done ) {
    this.timeout(0);
  });
});
