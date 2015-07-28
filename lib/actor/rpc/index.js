'use strict';

var EtcManager = require('../etcManager');
var ActorManager = require('../actorManager');
var zerorpc = require('zerorpc');
var util = require('util');
var RpcClient = require('./rpcClient');
var RpcServer = require('./rpcServer');
var logger = require('../../logger').getLogger('cosmos');

var Rpc = function Rpc(etcManager, actor) {

	this.ignoreMethods = ['init'];

	this.etcManager = etcManager;

	var $this = this;
	this.etcManager.on('onActorsChanged', function () {
		logger.info('================== onActorsChanged');
		$this.onActorsChanged.apply($this, arguments);
	});
	logger.info(util.inspect(this.etcManager.listeners('onActorsChanged')));
	this.actor = actor;

	this.rpcClients = {};

	this.rpcServer = new RpcServer(this.actor);
};

Rpc.prototype.init = function () {
	// register
	var $this = this;
	return $this.register().then(function () {

		// heartbreak for etcd
		setInterval(function () {
			return $this.register().then(function () {
				logger.info('Heartbreak Register Actor');
			});
		}, $this.etcManager.etcConfig.heartbreak * 1000);

		logger.info('=== Rpc finish started! ===');
	});
};

Rpc.prototype.register = function () {
	var $this = this;
	return this.etcManager.registerActor(this.actor).then(function (isSuccess) {
		if (!isSuccess) {
			logger.error('Error registerActor!');
			return new Promise(function (resolve) {
				resolve({});
			});
		} else {
			logger.info('Success register rpc actor!');
		}
	});
};

// trigger by etcManager event
Rpc.prototype.onActorsChanged = function (actors) {

	// get actors, function init
	for (var key in actors) {
		var actor = actors[key];
		var actorName = actor.name;
		var funcs = actor.functions;

		// create the Rpc client
		var client = new zerorpc.Client();
		var rpcHost = actor.host;
		var rpcPort = actor.rpcPort;
		var serverUri = 'tcp://' + rpcHost + ':' + rpcPort;

		// except self
		if (rpcHost == this.actor.config.host && rpcPort == this.actor.rpcPort) {
			logger.info('Ignore self when rpc creatation');
			continue;
		}
		logger.info('Connect to RPC Server: ' + serverUri);

		client.connect(serverUri);

		var rpcClient = new RpcClient(client);

		this.rpcClients[actor.name] = rpcClient;

		// proxy to rpc
		var proxyFuncs = {};

		// define the Actor into this rpc class
		this[actorName] = proxyFuncs;
		logger.info('[Bind RPC] bind %s to self:%s', actorName, this.actor.name);
		// rpc function create
		funcs.forEach(function (funcName) {
			logger.info(util.format('Create Function: %s, From actor: %s', funcName, actor.host + ':' + actor.rpcPort));
			proxyFuncs[funcName] = function () {
				return new Promise(function (resolve, reject) {
					return rpcClient.call(funcName).then(function (res) {
						resolve(res);
					})['catch'](function (err) {
						reject(err);
					});
				});
			};
		});
	}
};

module.exports = Rpc;