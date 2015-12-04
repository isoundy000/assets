'use strict';

Editor.require('app://editor/test-utils/renderer/init');

const AssetsUtils = Editor.require('packages://assets/test/utils');

let dbData = [
  // =======
  {
    name: 'assets',
    extname: '',
    type: 'mount',
    uuid: 'mount-assets',

    children: [
      {
        name: 'a folder',
        extname: '',
        type: 'folder',

        children: [
          {
            name: 'foo',
            extname: '.asset',
            type: 'asset',
          },
          {
            name: 'bar',
            extname: '.asset',
            type: 'asset',
          },
        ]
      },
      {
        name: 'foo-bar',
        extname: '.asset',
        type: 'asset',
      },
    ],
  },

  // =======
  {
    name: 'packages',
    extname: '',
    type: 'mount',
    uuid: 'mount-packages',
    children: [
      {
        name: 'foo-bar',
        extname: '.asset',
        type: 'asset',
      },
    ],
  },
];

// stub functions
let deepQuery = sinon.stub( Editor.assetdb, 'deepQuery' );
deepQuery.yields( AssetsUtils.dump(dbData) );

//
describe('<editor-assets>', function() {
  Helper.runPanel( 'assets.panel' );

  it('should keep running', function ( done ) {
    this.timeout(0);
  });
});
