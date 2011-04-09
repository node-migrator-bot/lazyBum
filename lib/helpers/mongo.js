var mongo = require('mongodb')
	lb = require('lbConfig'),
	lbLogger = require('lbLogger');

var log = new lbLogger(module);

var config = lb.getConfig();
var host = 'localhost', port = mongo.Connection.DEFAULT_PORT;
var db = new mongo.Db(config.databaseName, new mongo.Server(host,port,{}),{});
var dbclient = null;

db.open(function(err, client){ dbclient = client });

exports.insert = function(table, doc){
	dbclient.collection(table, function(err, collection){
		if(err){ log.error(err); }
		collection.insert(doc, function(err, docs){
			if(err){
				log.error(err);
			}
		})
	})
}

exports.find = function(table, search, callback, options){
	var opt = options || {};
	dbclient.collection(table, function(err, collection){
		collection.find(search, opt,function(err, cursor){
			cursor.toArray(function(err, results){
				callback(results);
			})
		})
	})
}

exports.update = function(table, selector, update, callback){
	dbclient.collection(table, function(err, collection){
		collection.update(selector, update, {upsert:true, multi:false}, function(err, result){
			if(err){ log.error(err) }
			callback(result)
		})
	})
}

exports.mapReduce = function(mapFunction, reduceFunction, callback){
	var that = this;
	command = {
		mapreduce: "blog",
		out: "mrtest",
		map: mapFunction.toString(),
		reduce: reduceFunction.toString()
	};
	dbclient.executeDbCommand(command, function(err, dbres){		
		callback(dbres.documents[0]);
	})		
}

exports.distinct = function(collection, key, callback){
	dbclient.executeDbCommand({distinct: collection, key: key}, function(err, dbres){
		callback(dbres.documents[0].values)
	})
}

exports.removeAll = function(table, callback){
	dbclient.collection(table, function(err, collection){
		collection.remove(function(err, collection){
			callback();
		})
	})
}