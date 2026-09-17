const fs=require('node:fs');
const path=require('node:path');
// The pinned viewer ships a prebuilt browser bundle. Expose its renderer to our
// small animation extension without editing node_modules or rebuilding assets.
function viewerBundle(){
 const source=fs.readFileSync(path.join(path.dirname(require.resolve('prismarine-viewer')),'public/index.js'),'utf8');
 const anchor='const u=new r(l);';
 if(source.split(anchor).length!==2)throw new Error('Viewer bundle changed; review the animation bridge before upgrading prismarine-viewer.');
 return source.replace(anchor,anchor+'window.dispatchEvent(new CustomEvent("demo-viewer-ready",{detail:{viewer:u,socket:o}}));');
}
module.exports={viewerBundle};
