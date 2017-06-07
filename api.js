var XCPDClient = require('node-xcpd-client');
var BVAMClient = require('node-bvam-client');
var log        = require('npmlog');
var fs         = require('fs');
var bodyParser = require('body-parser')
var bvam       = require('./bvam')

log.debug = log.verbose;
log.disableColor();

var api = {};
var apiMethods = {} 

var client;
var bvamClient;

api.init = function(options) {
    var xcpdOpts = options.xcpd || {};
    var bvamOpts = options.bvam || {};

    // ensure cache dir
    var cacheDir = xcpdOpts.cacheDir || __dirname+'/../../counterparty_asset_data';
    if (!fs.existsSync(cacheDir)) { fs.mkdirSync(cacheDir); }

    client = XCPDClient.connect({
        host:      xcpdOpts.host     || 'localhost',
        port:      xcpdOpts.port     || 4000,
        username:  xcpdOpts.username || null,
        password:  xcpdOpts.password || null,

        cacheFile: cacheDir+'/cache.db',
    });

    bvamClient = BVAMClient.connect({
        connectionString: xcpdOpts.connectionString || 'https://bvam.tokenly.com',
    })

    log.info('api.init')
}

api.route = function(app, express) {
    app.use(bodyParser.json());

    app.get('/version',                   apiMethods.version);

    app.get('/balances/:address',         apiMethods.getBalances);

    app.get('/asset/:asset/info',         apiMethods.getAssetInfo);
    app.get('/asset/:asset/divisibility', apiMethods.getAssetDivisibility);
    app.post('/bvam/info',                apiMethods.getBvamInfo);
    app.post('/bvam',                     apiMethods.addBvamData);

    app.post('/transactions',             apiMethods.findTransactionsById);
}

// ------------------------------------------------------------------------

var cachedVersion = null
apiMethods.version = function(req, res) {
    if (cachedVersion == null) {
        var pkginfo = require('pkginfo')(module, 'version', 'author');
        cachedVersion = module.exports.version;
    }
    sendJson(res, {version: cachedVersion});
}

apiMethods.getBalances = function(req, res) {
    var address = req.params.address;
    client.getBalances(address).then(
        function(balances) {
            sendJson(res, balances);
        }, 
        sendErrJsonHandlerWithResponse(res)
    );
};

apiMethods.getAssetInfo = function(req, res) {
    var assetName = req.params.asset;
    client.getAssetInfo(assetName).then(
        function(response) {
            sendJson(res, response);
        }, 
        sendErrJsonHandlerWithResponse(res)
    );
};

apiMethods.getBvamInfo = function(req, res) {
    var assets = (req.body.assets == null ? [] : req.body.assets);
    log.info('=BVAM= assets is '+JSON.stringify(assets,null,2));
    bvamClient.getAssetInfo(assets)
    .then(
        function(assetsData) {
            log.info('=BVAM= assetsData is '+JSON.stringify(assetsData.length,null,2));
            // log.info('=BVAM= assetsData is '+JSON.stringify(assetsData,null,2));
            return bvam.processCounterpartyAssets(assetsData);
        }, 
        sendErrJsonHandlerWithResponse(res)
    )
    .then(
        function(response) {
            sendJson(res, response);
        }, 
        sendErrJsonHandlerWithResponse(res)
    );
};

apiMethods.addBvamData = function(req, res) {
    var bvam = (req.body.bvam == null ? {} : req.body.bvam);
    log.info('=BVAM= addBvamData '+JSON.stringify(bvam,null,2));
    bvamClient.addBvamData(bvam)
    .then(
        function(response) { sendJson(res, response); }, 
        sendErrJsonHandlerWithResponse(res)
    );
};

apiMethods.getAssetDivisibility = function(req, res) {
    var assetName = req.params.asset;
    client.isDivisible(assetName).then(
        function(isDivisible) {
            sendJson(res, {divisible: isDivisible});
        }, 
        sendErrJsonHandlerWithResponse(res)
    );
};

apiMethods.findTransactionsById = function(req, res) {
    var txIds       = (req.body.txids == null ? [] : req.body.txids);
    var address     = (req.body.address == null ? null : req.body.address);
    var withMempool = (req.body.mempool == null ? true : !!req.body.mempool);

    // check length
    log.info('findTransactionsById withMempool='+(withMempool)+' txIds:', JSON.stringify(txIds))
    if (txIds.length === 0) { return sendErrJsonResponse(res, 'No txids were provided', 400); }

    var promises = [];
    promises.push(client.findTransactionsById(txIds, address));

    if (withMempool) {
        promises.push(client.findMempoolTransactionsById(txIds, address));
    }


    Promise.all(promises).then(
        function(arraysOfTxEntries) {
            var txEntries = [];
            for (var i = 0; i < arraysOfTxEntries.length; i++) {
                for (var j = 0; j < arraysOfTxEntries[i].length; j++) {
                    txEntries.push(arraysOfTxEntries[i][j]);
                }
            }

            log.info('findTransactionsById sending response txEntries:', JSON.stringify(txEntries))
            sendJson(res, txEntries);
        },
        sendErrJsonHandlerWithResponse(res)
    )
};


// ------------------------------------------------------------------------

function sendErrJsonHandlerWithResponse(res) {
    return function (err) {
        sendErrJsonResponse(res, err, 500)
    }
}

function sendErrJsonResponse(res, err, code) {
    if (code == null) {
        code = 500;
        console.error('there was an error: ', err);
    }

    log.warn(''+code+' error response: '+err)

    sendJson(res, {message: 'There was an error: '+err, error: ''+err}, code);
}

function sendJson(res, data, status) {
    if (status != null) {
        res.status(status);
    }

    res.json(data);
}


// ------------------------------------------------------------------------

module.exports = api;

