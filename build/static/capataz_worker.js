//! capataz 0.1.2
!function(self){"use strict";self.onmessage=function(a){var b=JSON.parse(a.data);b.error="Worker is not ready yet.",self.postMessage(JSON.stringify(b))},importScripts("require.js"),require(["creatartis-base"],function(base){self.base=base,self.onmessage=function onmessage(msg){var data=JSON.parse(msg.data);base.Future.invoke(eval,self,data.code||"").then(function(a){data.result=a,self.postMessage(JSON.stringify(data))},function(a){data.error=a+"",self.postMessage(JSON.stringify(data))})},self.postMessage("Ready")})}(self);