var mongo = require('mongodb'),
	ObjectID = mongo.BSONPure.ObjectID,
	lbLogger = require('../LBLogger'),
	Ahead = require('./ahead');

var log = new lbLogger(module);

exports.getMongoId = function(idStr) {
	return new mongo.BSONPure.ObjectID(idStr);
}

exports.createDbClient = function(dbName, host, port) {
	function DBClient(dbName, host, port) {
		port = port || mongo.Connection.DEFAULT_PORT;
		this.db = new mongo.Db(dbName, new mongo.Server(host, port, {}), {});
		this.client = null;
		this.errorMsg = null;
		this.error = false;
		this.ahead = new Ahead();
	}
	
	function checkAndSetId(doc){
		if(doc._id){
			log.trace("Wrapping in ObjectID: " + doc._id)
			doc._id = ObjectID.createFromHexString(doc._id)
		}
		return doc;
	}
	
	DBClient.prototype.connect = function() {
		var that = this;
		this.ahead.next(function(done) {
			that.db.open(function(err, client) {				
				if(err) {
					log.error(err.stack);
				}
				that.client = client;
				done(null, err);				
			})
		});
		
		return this.ahead;
	};
	
	DBClient.prototype.closeConnection = function() {
		var that = this;
		return this.ahead.next(function(done, args, err) {
			if(err) {
				log.error(err.stack);
			}
			that.client.close();
			done();
		});
	}
	
	DBClient.prototype.getCollection = function(table) {
		var that = this;
		return this.ahead.next( function(done) {
			that.client.collection(table, function(err, collection) { 
				if(err) {
					log.error(err.stack);
				}
				done(collection, err); 
			});
		})
	}
	
	DBClient.prototype.insert = function(table, doc) {
		return this.getCollection(table).next(function(done, collection) {
			collection.insert(doc, function(err, docs) {
				if(err) {
					log.error(err.stack);
				}
				done(docs, err);
			});
		});
	}
	
	DBClient.prototype.find = function(table, search, options) {
		var opt = options || {};
		search = checkAndSetId(search);
		return this.getCollection(table).next(function(done, collection) {
			collection.find(search, opt, function(err, cursor){
				if(err) {
					log.error(err.stack);
				}
				done(cursor, err);
			})
		}).next(function(done, cursor) {
			cursor.toArray(function(err, results) {
				if(err) {
					log.error(err.stack);
				}
				done(results, err);
			})
		})
	}
	
	DBClient.prototype.update = function(table, selector, update) {
		return this.getCollection(table).next(function(done, collection) {
			collection.update(selector, update, {upsert:true, multi:false}, function(err, result){
				log.trace('updated')
				if(err) {
					log.error(err.stack);
				}
				done({successful:true}, err);
			})
		});		
	}
	
	DBClient.prototype.mapReduce = function(table, map, reduce, options) {
		return this.getCollection(table).next(function(done, collection) {
			collection.mapReduce(map, reduce, options, function(err, result){
		      	if(err) {
					log.error(err.stack);
				}
				done(result, err)
		    });
		});
	}
	
	DBClient.prototype.distinct = function(collection, key) {
		var that = this;
		return this.ahead.next(function(done) {
			that.client.executeDbCommand({distinct: collection, key: key}, function(err, dbres){
				if(err) {
					log.error(err.stack);
				}
				done(dbres.documents[0].values, err)
			})
		})
	}
	
	DBClient.prototype.remove = function(table, selector) {
		return this.getCollection(table).next(function(done, collection) {
			collection.remove(selector, function(err, result){
				if(err) {
					log.error(err.stack);
				}
				done(result, err)
			})
		});
	}
	
	DBClient.prototype.removeAll = function(table) {
		return this.getCollection(table).next(function(done, collection) {
			collection.remove(function(err, result){
				if(err) {
					log.error(err.stack);
				}
				done(result, err)
			})
		});
	}
	
	return new DBClient(dbName, host, port);
}



