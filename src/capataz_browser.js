/** Capataz module to run under a browser's rendering thread.
*/
require(['basis'], function (basis) { "use strict";
	window.basis = basis;
	var APP = window.APP = {},
		CONFIG = APP.CONFIG = {
			startTime: Date.now(),
			jobURI: '/job',
			workerCount: 2,
			maxRetries: 50,
			minDelay: 100, // 100 milliseconds.
			maxDelay: 2 * 60000, // 2 minutes.
		},
		LOGGER = APP.LOGGER = basis.Logger.ROOT;
	LOGGER.appendToHtml('log', 30);
	LOGGER.info('Starting '+ CONFIG.workerCount +' workers.');

	/** APP.Drudger():
		A wrapper for the rendering thread's side of a web worker.
	*/
	APP.Drudger = basis.declare({ //////////////////////////////////////////////
		constructor: function Drudger() {
			// Nothing for now.
		},

		initialize: function initialize() {
			var ready = new basis.Future();
			if (typeof Worker === 'function') {
				this.webworker = new Worker('capataz_worker.js');
				this.webworker.onmessage = function (msg) {
					ready.resolve(msg.data || true);
				};
			} else {
				ready.resolve(false);
			}
			return ready;
		},
		
		onWorkerMessage: function onWorkerMessage(future, msg) {
			var data = JSON.parse(msg.data);
			if (data.hasOwnProperty('error')) {
				future.reject(data.error);
			} else if (data.hasOwnProperty('result')) {
				future.resolve(data.result);
			}
		},

	// Main workflow. //////////////////////////////////////////////////////////

		getTask: function getTask() {
			return basis.Future.retrying(function () {
				LOGGER.info('< Requesting jobs.');
				return basis.HttpRequest.getJSON(CONFIG.jobURI).then(function (task) {
					if (task.serverStartTime > CONFIG.startTime) {
						LOGGER.info('> Definitions are outdated. Reloading...');
						window.location.reload();
					}
					LOGGER.info('> Received '+ task.jobs.length +' jobs. E.g.: '+ task.jobs[0].info);
					return task;
				}, function (xhr) {
					LOGGER.warn('! Job request failed: ', xhr.status, ' ', 	xhr.statusText, ': ', xhr.responseText, '');
					throw new Error('Job request failed!'); // So failure is not captured.
				});
			}, CONFIG.maxRetries, CONFIG.minDelay, 2, CONFIG.maxDelay).fail(function () {
				LOGGER.error('Job request failed too many times. Not retrying anymore.');
			});
		},
		
		doJob: function doJob(job) {
			var drudger = this;
			if (this.webworker) {
				var future = new basis.Future();
				this.webworker.onmessage = this.onWorkerMessage.bind(this, future);
				this.webworker.postMessage(JSON.stringify(job));
				return future;
			} else {
				// If web workers are not available, execute in the rendering thread.
				return basis.Future.invoke(eval, this, job.code);
			}
		},
		
		doWork: function doWork(task) {
			var drudger = this;
			return basis.Future.sequence(task.jobs, function (job) {
				job.clientPlatform = navigator.platform; // Set job's client properties.
				job.startedAt = Date.now();
				return drudger.doJob(job).then(function (result) { // Jobs finishes well.
					job.result = result; 
					job.time = Date.now() - job.startedAt;
					LOGGER.debug('> ', job.info, ' -> ', result);
					return job;
				}, function (error) { // Jobs finishes badly or aborts.
					job.error = error;
					job.time = Date.now() - job.startedAt;
					LOGGER.warn('> ', job.info, ' !! ', error);
					return job;
				});
			}).then(function () {
				return task;
			});
		},
		
		postResults: function postResults(task) {
			return basis.Future.retrying(function () {
				LOGGER.info("< Posting results.");
				return basis.HttpRequest.postJSON(CONFIG.jobURI, task).fail(function (xhr) {
					LOGGER.warn('! Posting failed: ', xhr.status, ' ', xhr.statusText, ' ', xhr.responseText, '.');
				});
			}, CONFIG.maxRetries, CONFIG.minDelay, 2, CONFIG.maxDelay).fail(function () {
				LOGGER.error('Job result post failed too many times. Not retrying anymore.');
			});
		},
		
		drudge: function drudge() {
			var drudger = this;
			return basis.Future.doWhile(function () {
				return drudger.getTask()
					.then(drudger.doWork.bind(drudger))
					.then(drudger.postResults.bind(drudger));
			}, function () { 
				return true; // Loop forever.
			}).fail(function (err) {
				LOGGER.error('Uncaught error on drudger! '+ err);
			});
		}
	}); // declare Drudger.
	
	APP.start = function start() {
		APP.drudgers = basis.Iterable.range(CONFIG.workerCount).map(function () {
			return new APP.Drudger();
		}).toArray();
		basis.Future.sequence(APP.drudgers, function (drudger) {
			return drudger.initialize().done(drudger.drudge.bind(drudger));
		});
	}; // start.
	
	if (document.readyState === 'complete') {
		APP.start();
	} else {
		window.addEventListener('load', APP.start, false);
	}
}); // require basis.