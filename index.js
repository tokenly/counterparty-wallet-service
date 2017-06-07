var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;
var api = require('./api');
var log = require('npmlog');
log.debug = log.verbose;
log.disableColor();

function CounterpartyService(options) {
    EventEmitter.call(this);
    this.node = options.node;

    api.init(options);
}
inherits(CounterpartyService, EventEmitter);

CounterpartyService.dependencies = ['bitcoind','web'];

CounterpartyService.prototype.start = function(callback) {
    log.debug('Counterparty Service START');

    setImmediate(callback);
};

CounterpartyService.prototype.stop = function(callback) {
    log.debug('Counterparty Service STOP');

    setImmediate(callback);
};

CounterpartyService.prototype.getPublishEvents = function() {
    return [];
};

CounterpartyService.prototype.setupRoutes = function(app, express) {
    app.use(function(req, res, next) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
      res.setHeader('Access-Control-Allow-Headers', 'x-signature,x-identity,x-client-version,X-Requested-With,Content-Type,Authorization');
      // res.setHeader('x-service-version', WalletService.getServiceVersion());
      next();
    });
    var allowCORS = function(req, res, next) {
      if ('OPTIONS' == req.method) {
        res.sendStatus(200);
        res.end();
        return;
      }
      next();
    }
    app.use(allowCORS);
    app.enable('trust proxy');


    api.route(app, express);
};

CounterpartyService.prototype.getRoutePrefix = function() {
    var routePrefix = 'counterparty/api/v1';
    return routePrefix
};



// ------------------------------------------------------------------------

module.exports = CounterpartyService;

