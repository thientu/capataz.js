//! capataz 0.1.5
require(["creatartis-base"],function(base){"use strict";window.base=base;var APP=window.APP={},STATS=APP.stats={received:0,finished:0,failed:0,reported:0},CONFIG;APP.Drudger=base.declare({"static __count__":0,constructor:function a(){this.__number__=a.__count__++},initialize:function(a){a=0|a;var b=new base.Future;return a>=0&&"undefined"!=typeof Worker?(this.webworker=new Worker("capataz_worker.js"),this.webworker.onmessage=function(a){b.resolve(a.data||!0)}):a>0?b.reject("Webworkers are required but are not supported in this browser!"):b.resolve(!1),b},onWorkerMessage:function(a,b){var c=JSON.parse(b.data);c.hasOwnProperty("error")?a.reject(c.error):c.hasOwnProperty("result")&&a.resolve(c.result)},getTask:function(){var a=this;return base.Future.retrying(function(){return console.info(a.__number__+" < Requesting jobs."),base.HttpRequest.getJSON(CONFIG.jobURI).then(function(b){return b.serverStartTime>CONFIG.startTime&&(console.info(a.__number__+" > Definitions are outdated. Reloading..."),window.location.reload()),console.info(a.__number__+" > Received "+b.jobs.length+" jobs. E.g.: "+b.jobs[0].info),STATS.received++,APP.updateJobReport(),b},function(b){throw console.warn(a.__number__+" ! Job request failed (status: ",b.status," ",b.statusText,' "',b.responseText,'")!'),new Error("Job request failed!")})},CONFIG.maxRetries,CONFIG.minDelay,2,CONFIG.maxDelay).fail(function(){console.error(a.__number__+" ! Job request failed too many times! Not retrying anymore.")})},doWork:function(a){var b=this;return base.Future.sequence(a.jobs,function(a){return a.clientPlatform=navigator.platform,a.startedAt=Date.now(),b.doJob(a).then(function(c){return STATS.finished++,APP.updateJobReport(),a.result=c,a.time=Date.now()-a.startedAt,CONFIG.logDebug&&console.debug(b.__number__+" > ",a.info," -> ",c),a},function(c){return a.error=c,a.time=Date.now()-a.startedAt,console.warn(b.__number__+" > ",a.info," !! ",c),STATS.failed++,APP.updateJobReport(),a})}).then(function(){return a})},doJob:function doJob(job){var drudger=this;if(this.webworker){var future=new base.Future;return this.webworker.onmessage=this.onWorkerMessage.bind(this,future),this.webworker.postMessage(JSON.stringify(job)),future}return base.Future.invoke(eval,this,job.code)},postResults:function(a){var b=this;return base.Future.retrying(function(){return console.info(b.__number__+" < Posting results."),base.HttpRequest.postJSON(CONFIG.jobURI,a).done(function(){STATS.reported++,APP.updateJobReport()}).fail(function(a){console.warn(b.__number__+" ! Posting failed: ",a.status," ",a.statusText," ",a.responseText,".")})},CONFIG.maxRetries,CONFIG.minDelay,2,CONFIG.maxDelay).fail(function(){console.error(b.__number__+" ! Job result post failed too many times! Not retrying anymore.")})},drudge:function(){var a=this;return base.Future.doWhile(function(){return a.getTask().then(a.doWork.bind(a)).then(a.postResults.bind(a))},function(){return!0}).fail(function(b){console.error(a.__number__+" Uncaught error on drudger! "+b)})}}),APP.start=function(){var a={};return window.location.search.substring(1).split("&").forEach(function(b){b=b.split("=").map(decodeURIComponent),2==b.length&&(a[b[0]]=b[1])}),base.HttpRequest.getJSON(a.configURI||"config.json").then(function(b){CONFIG=APP.CONFIG=base.copy(a,b,{jobURI:"task.json",workerCount:2,adjustWorkerCount:!0,maxRetries:50,minDelay:100,maxDelay:12e4,logLength:30,logDebug:!1}),CONFIG.startTime=Date.now();var c=CONFIG.adjustWorkerCount&&navigator.hardwareConcurrency?navigator.hardwareConcurrency:CONFIG.workerCount;return console.info("Starting "+c+" workers."),APP.drudgers=base.Iterable.range(c).map(function(){return new APP.Drudger}).toArray(),base.Future.sequence(APP.drudgers,function(a){return a.initialize(CONFIG.useWebworkers).done(a.drudge.bind(a))})})},APP.updateJobReport=function(){var a=document.getElementById("job-report"),b=this.stats;a.innerHTML="Tasks: "+b.received+" received, "+b.reported+" reported.<br/>Jobs: "+b.finished+" finished, "+b.failed+" failed."},"complete"===document.readyState?APP.start():window.addEventListener("load",APP.start,!1)});