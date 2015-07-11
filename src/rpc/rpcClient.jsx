
class RpcClient {

	constructor(client) {
		this.client = client;
	}

	call(funcName : string) {
		var $arguments = arguments;
		return new Promise((resolve, reject) => {
			console.log("Rpc to function: " + funcName);
			var $this = this;
			var applyArgs = [];
			applyArgs.push('call'); // server.call rpc top func
			var funcArgs = []
			funcArgs.push(funcName);
			for (var i in $arguments) {
				if (i != 0) {
					funcArgs.push($arguments[i]);
				}
			}
			applyArgs.push(funcArgs);
			applyArgs.push(function(error, res, more) {
				if (error) {
					console.error(error);
					reject(error);
				} else {
					resolve(res);	
				}
			});

			console.log("Promise to function: " + funcName);
			console.dir($this.client);
			$this.client.invoke.apply($this.client, applyArgs);
			// $this.client.invoke('rpcTestFromActor1', (err, res, more) => {
			// 	console.error("back!!!!!!!!!!!!");
			// });
		});
		
	}
}



module.exports = RpcClient;