'use strict';

const Uuid = require('node-uuid');

function _dump ( results, parentUuid, entry ) {
  let uuid = entry.uuid || Uuid.v4();

  results.push({
    name: entry.name,
    extname: entry.extname,
    isSubAsset: entry.isSubAsset,
    type: entry.type,
    uuid: uuid,
    parentUuid: parentUuid,
  });

  if ( entry.children ) {
    entry.children.forEach(child => {
      _dump( results, uuid, child );
    });
  }
}

let Utils = {
  dump ( data ) {
    if ( Array.isArray(data) === false ) {
      data = [data];
    }

    let results = [];
    data.forEach( entry => {
      _dump( results, '', entry );
    });
    return results;
  }
};

module.exports = Utils;
