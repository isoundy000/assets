'use strict';

Editor.require('app://editor/page/page-init-for-test');

describe('<editor-assets>', function() {
    Helper.runPanel( 'assets.panel' );

    var deepQuery = sinon.stub( Editor.assetdb, 'deepQuery' );
    deepQuery.yields([{
        uuid: 'assets',
        name: 'assets',
        extname: '',
        type: 'mount',
        children: [
            {
                uuid: '1b984894-76c5-4687-b3b3-3f6f4e9f5f2c',
                name: 'backgrounds',
                extname: '',
                type: 'folder',
                children: [
                    {
                        uuid: 'd5f4bd68-519b-40e9-95ce-10db7ac837c1',
                        name: 'foo',
                        extname: '.asset',
                        type: 'asset',
                    },
                    {
                        uuid: '6e4ee64b-357c-4cb5-bbed-292f0312afab',
                        name: 'bar',
                        extname: '.png',
                        type: 'texture',
                    },
                ]
            },
            {
                uuid: '149c6d29-119e-4ba7-84bd-1fd4ce1f46cd',
                name: 'simple-texture',
                extname: '.png',
                type: 'texture',
            },
        ],
    }]);

    it('should load asset when ready', function( done ) {
        let targetEL = Helper.targetEL;

        expect( Polymer.dom(targetEL.$.tree).children[0].name ).to.be.equal('assets');
        expect( targetEL.$.tree._id2el['149c6d29-119e-4ba7-84bd-1fd4ce1f46cd'].name ).to.be.equal('simple-texture');
        done();
    });

    it('should focus on search', function( done ) {
        let targetEL = Helper.targetEL;

        targetEL.focusOnSearch();
        expect( targetEL.$.search.focused ).to.be.equal(true);
        done();
    });

    it('should select the item', function( done ) {
        let targetEL = Helper.targetEL;

        let fn = sinon.spy(targetEL.$.tree, '_onItemSelect');
        let itemEL = targetEL.$.tree._id2el['1b984894-76c5-4687-b3b3-3f6f4e9f5f2c'];

        setTimeout(() => {
            Helper.click(itemEL);

            expect(fn.calledOnce).to.be.equal(true);

            fn.restore();
            done();
        }, 10);
    });
});
