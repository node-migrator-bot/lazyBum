var logger = require('./LBLogger'),
	lbUtils = require('./helpers/utils'),
	helpersUtil = require('./helpersUtil'),
	EventEmitter = require('events').EventEmitter,
	path = require('path');

var log = new logger(module);

var LBBase = function(reqData) {
	if(reqData) {	
		this.reqData = reqData;
		this.loadHelpers();
		this.addCollections();
	}
};

LBBase.prototype.addCollections = function() {
	if(typeof this.collections !== 'undefined') {
		for(var i = 0; i < this.collections.length; i++) {
			var name = this.collections[i];
			this[name] = new (this.reqData.lazyBum.getCollectionClass(name))();
			var listeners = this.listeners(LBBase.LBEVENT);
			for(var list in listeners) {
				this[name].addPrimaryListenter(list);
			}
		}
	}
};

LBBase.prototype.loadHelpers = function() {
	if(typeof this.helpers !== 'undefined') {
		for(var i = 0; i < this.helpers.length; i++) {
			if(helpersUtil.rootHelpers.indexOf(this.helpers[i] + '.js') > -1) {
				log.trace('loading helper ' + this.helpers[i]);
				this[this.helpers[i]] = require('./helpers/' + this.helpers[i]);	
			} else {
				this[this.helpers[i]] = {};
			}

			if(helpersUtil.localHelpers.indexOf(this.helpers[i] + '.js') > -1) {
				var helper = require(process.cwd() + '/helpers/' + this.helpers[i]);
				for(prop in helper) {
					this[this.helpers[i]][prop] = helper[prop];
				}
			}
		}		
	}
};

LBBase.prototype.setHeader = function(name, value) {
	log.trace('setting header ' + name) + ' to ' + value;

	this.reqData.headers.push([name, value]);
};

LBBase.prototype.getResponseHeader = function(name) {
	var headerVal = '';
	for(var i = 0; i < this.reqData.heaaders.length; i++) {
		if(this.reqData.headers[i][0] === name) {
			headerVal = this.reqData.headers[i][1];
			break;
		}
	}
	return headerVal;	
};

LBBase.prototype.getHeader = function(name) {
	return this.reqData.request.headers[name];	
};

LBBase.prototype.setResponseCode = function(responseCode) {
	this.reqData.responseCode = responseCode;
}

LBBase.prototype.redirect = function(newURL) {
	log.trace('redirect');
	this.emit(LBBase.REDIRECT, this.reqData, newURL);
	this.emit(LBBase.LBEVENT, LBBase.REDIRECT, this.reqData, [newURL]);
};

LBBase.prototype.endResponse = function(data) {
	log.trace('fire endResponse event ');
	this.emit(LBBase.RESP_COMPLETE, this.reqData, data);
	this.emit(LBBase.LBEVENT, LBBase.RESP_COMPLETE, this.reqData, [data]);
};

LBBase.prototype.sendAuthorizationRequired = function() {
	this.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
	this.setHeader("Content-Type", "text/html");
	this.setResponseCode(401);
	this.writeData('<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"' +
	     '"http://www.w3.org/TR/1999/REC-html401-19991224/loose.dtd">' +
	    '<HTML>' +
	      '<HEAD>' +
	        '<TITLE>Error</TITLE>' +
	        '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=ISO-8859-1">' +
	      '</HEAD>' +
	      '<BODY><H1>401 Unauthorized.</H1></BODY>' +
	    '</HTML>');
	this.endResponse();
}

LBBase.prototype.writeData = function(data) {
	log.trace('sending writeData');
	this.emit(LBBase.HAS_DATA, this.reqData, data);
	this.emit(LBBase.LBEVENT, LBBase.HAS_DATA, this.reqData, [data]);
};

LBBase.prototype.showNotFound = function(responseCode) {
	if(!responseCode) {
		responseCode = 404;
	}

	log.trace("sending not found");
	this.emit(LBBase.NOT_FOUND, this.reqData, [responseCode]);
	this.emit(LBBase.LBEVENT, LBBase.NOT_FOUND, this.reqData, [responseCode]);
}

LBBase.prototype.showError = function(errorMessage, responseCode) {
	if(!responseCode) {
		responseCode = 500;
	}

	log.trace("sending error event: " + errorMessage);
	this.emit(LBBase.ERROR, this.reqData, [responseCode, errorMessage]);
	this.emit(LBBase.LBEVENT, LBBase.ERROR, this.reqData, [responseCode, errorMessage]);
}

LBBase.prototype.addPrimaryListener = function(func) {
	this.addListener(LBBase.LBEVENT, func);
}

LBBase.extend = lbUtils.createExtendable(LBBase);

LBBase.LBEVENT = 'lbevent';

LBBase.INIT_COMPLETE = "initComplete";
LBBase.ROUTING_COMPLETE = "routingComlete";
LBBase.PRECONTROLLER_COMPLETE = "preControllerComplete";
LBBase.CONTROLLER_COMPLETE = "controllerComplete";
LBBase.POSTCONTROLLER_COMPLETE = "postControllerComplete";
LBBase.FILE_FOUND = "fileFound";
LBBase.FILE_NOT_EXISTS = "fileNotExists";
LBBase.HAS_DATA = "hasData";
LBBase.RESP_COMPLETE = "respComplete";
LBBase.REDIRECT = "redirect";
LBBase.NOT_FOUND = "notFound";
LBBase.ERROR = "error";


module.exports = LBBase;

