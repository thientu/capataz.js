//! capataz 0.1.5
!function(self){"use strict";self.onmessage=function(a){var b=JSON.parse(a.data);b.error="Worker is not ready yet.",self.postMessage(JSON.stringify(b))},importScripts("require.js"),require(["creatartis-base"],function(base){self.base=base,self.onmessage=function onmessage(msg){var data=JSON.parse(msg.data),code='(function () {"use strict";\n\treturn base.Future.imports.apply(this, '+JSON.stringify(data.imports||[])+").then(function (deps) {\n\t\treturn ("+data.fun+").apply(this, deps.concat("+JSON.stringify(data.args||[])+"));\n\t});\n})()";base.Future.invoke(eval,self,code).then(function(a){data.result=a,self.postMessage(JSON.stringify(data))},function(a){data.error='Execution failed with "'+a+'"!\nCode:\n'+code+"\nCallstack:\n\t"+base.callStack(a).join("\n\t"),self.postMessage(JSON.stringify(data))})},self.postMessage("Ready")})}(self);