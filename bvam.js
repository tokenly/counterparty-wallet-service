var log     = require('npmlog');
var url     = require('url');
var request = require('request');
var _       = require('lodash');

log.debug = log.verbose;
log.disableColor();

var bvam = {};
var SATOSHI = 100000000;

bvam.processCounterpartyAssets = function(bvamProviderResults) {
    var promises = [];
    for (var i = 0; i < bvamProviderResults.length; i++) {
        // 
        if (bvamProviderResults[i].asset == null) { continue; }

        log.info('=BVAM= bvamProviderResults['+i+'] is '+JSON.stringify(bvamProviderResults[i],null,2));
        promises.push(buildBvamDataFromCounterpartyAssetData(bvamProviderResults[i]));
    }
    log.info('=BVAM= promises are '+JSON.stringify(promises.length,null,2));
    return Promise.all(promises)
}

// ------------------------------------------------------------------------

function buildBvamDataFromCounterpartyAssetData(bvamEntry) {

    // merge all the bvam data to the top level
    var bvamData = _.assign({}, bvamEntry);
    if (bvamEntry.assetInfo) {
        bvamData.assetInfo.supplyFloat = (bvamEntry.assetInfo.divisible ? bvamEntry.assetInfo.supply / SATOSHI : bvamEntry.assetInfo.supply);
    }

    return bvamEntry;
}

// ------------------------------------------------------------------------
// enhanced asset info

module.exports = bvam;

