(function(){"use strict";const o="https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";let e=null;async function c(){return e||(e=await(await import(`${o}pyodide.mjs`)).loadPyodide({indexURL:o}),await e.loadPackagesFromImports("import pandas, scipy, statsmodels"),await e.runPythonAsync(`import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", category=FutureWarning)`),e)}self.onmessage=async r=>{const{id:n,type:d,source:i="",files:l=[]}=r.data;let s="";try{const t=await c();if(d==="load"){self.postMessage({id:n,ok:!0,output:""});return}l.forEach(a=>t.FS.writeFile(a.name,a.content)),t.setStdout({batched:a=>{s+=`${a}
`}}),t.setStderr({batched:a=>{s+=`${a}
`}}),await t.loadPackagesFromImports(i),await t.runPythonAsync(i),self.postMessage({id:n,ok:!0,output:s})}catch(t){self.postMessage({id:n,ok:!1,output:s,error:String((t==null?void 0:t.message)??t)})}}})();
