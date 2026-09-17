const $ = id => document.getElementById(id);
let labels = {harvest_nearest:'Harvest nearest log',harvest_alternative:'Harvest other log',pickup:'Collect dropped log',explore:'Find more trees',return_home:'Return home',wait:'Wait'};
function renderBars(next){labels=next;$('bars').replaceChildren();
for(const [key,label] of Object.entries(labels)) {
  const row=document.createElement('div');row.className='bar-row';row.id=`bar-${key}`;
  const caption=document.createElement('div');caption.className='bar-caption';
  const name=document.createElement('span');name.textContent=label;
  const value=document.createElement('span');value.id=`value-${key}`;value.textContent='--';
  const track=document.createElement('div');track.className='bar-track';
  const fill=document.createElement('div');fill.className='bar-fill';fill.id=`fill-${key}`;fill.style.width='0%';
  caption.append(name,value);track.append(fill);row.append(caption,track);$('bars').append(row);
}
}
let lastScenario=null;
let lastReady=false;
const connection=document.createElement('section');
const connectionLabel=document.createElement('p');connectionLabel.className='eyebrow';connectionLabel.textContent='Connect a local Java world';
const lanPort=document.createElement('input');lanPort.type='number';lanPort.min='1024';lanPort.max='65535';lanPort.value='25575';lanPort.setAttribute('aria-label','Minecraft Java LAN port');lanPort.style.cssText='width:100px;padding:10px;background:#101614;color:#eef3ed;border:1px solid #40513e;border-radius:6px;margin-right:8px';
const connectButton=document.createElement('button');connectButton.className='secondary';connectButton.textContent='Connect';
const connectionHelp=document.createElement('p');connectionHelp.className='note';connectionHelp.textContent='In Java Edition, open a world to LAN and enter the port shown in chat, or use 25575 for the separate demo server once started. Java 1.21.4 is the target version.';
connection.append(connectionLabel,lanPort,connectButton,connectionHelp);document.querySelector('aside').append(connection);
connectButton.onclick=async()=>{try{const r=await fetch('/api/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({port:Number(lanPort.value)})});const s=await r.json();if(!r.ok)throw new Error(s.error);render(s);}catch(error){$('status').textContent=error.message;}};
function render(s) {
  if(lastScenario!==s.scenario){
    lastScenario=s.scenario;
    $('scenario').replaceChildren(...s.scenarios.map(item=>{const option=document.createElement('option');option.value=item.id;option.textContent=item.name+(item.available?'':' (coming next)');option.disabled=!item.available;return option;}));
    $('scenario').value=s.scenario;
  }
  const offered=s.latest?.request?.questions?.movement?.criteria||{};
  const offeredLabels=Object.fromEntries(Object.keys(offered).map(key=>[key,s.actionLabels[key]||key.replaceAll('_',' ')]));
  if(JSON.stringify(Object.keys(labels))!==JSON.stringify(Object.keys(offeredLabels)))renderBars(offeredLabels);
  $('scenario').disabled=s.busy;
  $('scenario').value=s.scenario;
  $('scenario-info').textContent=s.scenarios.find(item=>item.id===s.scenario).description;
  $('goal').value=s.goal;
  $('camera').disabled=!s.ready;$('camera').value=s.camera;
  $('camera').querySelector('[value="overview"]').disabled=s.scenario!=='flag'||!s.ready;
  const cameraLabel={third:'THIRD-PERSON FOLLOW',player:'FIRST-PERSON VIEW',overview:'OVERHEAD CAMERA'}[s.camera];
  document.querySelector('.world-label').textContent='MINECRAFT JAVA / '+cameraLabel;
  $('view').title='Live Minecraft '+cameraLabel.toLowerCase();
  $('milestones').textContent=s.task?.stage==='gathering'?'Mine the wool supply areas, collect every drop, then build.':s.task?.sections?Object.entries(s.task.sections).map(([name,p])=>name.replaceAll('_',' ')+': '+p.placed+'/'+p.total).join(' | '):'';
  $('task-meter').max=s.task?.target||(s.scenario==='flag'?338:10);
  if(s.scenario==='flag')$('task-progress').textContent=s.task?    (s.task.stage==='gathering'?'Gathering: '+s.task.inventory.red_wool+'/'+s.task.required.red_wool+' red, '+s.task.inventory.white_wool+'/'+s.task.required.white_wool+' white':s.task.collected+' / '+s.task.target+' flag blocks verified')+' | '+s.task.remainingSeconds+'s left':'Mine 234 red + 104 white wool, then build the flag.';
  if(s.ready)lanPort.value=String(s.gamePort);
  connectButton.disabled=s.ready||s.running;
  $('start').disabled=!s.ready || !s.keyConfigured || s.busy;
  $('pause').disabled=!s.running;
  $('restart').disabled=!s.ready||!s.keyConfigured||s.restarting||(s.busy&&!s.task);
  $('restart').textContent=s.restarting?'Restarting...':'Restart task';
  $('build-test').hidden=s.scenario!=='flag';$('build-test').disabled=$('restart').disabled;
  $('copy-input').disabled=!s.latest?.request;
  $('copy-output').disabled=!s.latest?.raw;
  $('goal').readOnly=true;
  $('status').textContent=s.status;
  if(s.scenario!=='flag')$('task-progress').textContent=s.task?`${s.task.collected} / ${s.task.target} logs | ${s.task.homeDistance} blocks from home | ${s.task.remainingSeconds}s left`: 'Collect 10 logs, then return home. Five-minute limit.';
  $('task-meter').value=s.task?.stage==='gathering'?s.task.inventory.red_wool+s.task.inventory.white_wool:s.task?.collected||0;
  $('start').textContent=s.running?'Task running':s.task&&!s.task.finished&&!s.task.complete&&s.task.remainingSeconds>0?'Resume task':'Start task';
  $('count').textContent=s.count;
  $('hud-goal').textContent=s.goal;
  $('empty').style.display=s.ready?'none':'flex';
  if(s.ready&&!lastReady) $('view').src='/view/';
  lastReady=s.ready;
  if(s.position) $('position').textContent=`${s.position.x.toFixed(1)} / ${s.position.y.toFixed(1)} / ${s.position.z.toFixed(1)}`;
  if(!s.latest){$('action').textContent='Ready';$('raw').textContent='No response yet.';$('input-raw').textContent='No request yet.';$('observation').textContent='Waiting for observations.';$('latency').textContent='--';$('confidence').textContent='--';return;}
  const {answer,latencyMs,state,raw,outcome,request}=s.latest;
  $('input-raw').textContent=request?JSON.stringify(request,null,2):'No captured request for this earlier decision.';
  $('action').textContent=labels[answer.choice];
  $('latency').textContent=latencyMs;
  $('confidence').textContent=`${Math.round(answer.confidence*100)}%`;
  $('model').textContent=raw.model;
  $('raw').textContent=JSON.stringify(raw,null,2);
  for(const key of Object.keys(labels)) {
    const p=answer.probabilities[key]||0;
    $(`value-${key}`).textContent=`${Math.round(p*100)}%`;
    $(`fill-${key}`).style.width=`${p*100}%`;
    $(`bar-${key}`).classList.toggle('selected',key===answer.choice);
  }
  $('observation').textContent=state.scenario==='flag'?`stage: ${state.task.stage}\nred wool: ${state.task.inventory.red_wool}\nwhite wool: ${state.task.inventory.white_wool}\nresult: ${outcome}` : `stage: ${state.task.stage}\nreachable logs: ${state.candidates.logs.length}\ndropped log: ${state.candidates.droppedLog?'yes':'none'}\nexploration route: ${state.candidates.exploreDestination?'available':'none'}`+`\nresult: ${outcome}`;
  $('observation').style.whiteSpace='pre-line';
}
const events=new EventSource('/api/events');
events.onmessage=e=>render(JSON.parse(e.data));
events.onerror=()=>{$('status').textContent='Dashboard disconnected. Reconnecting...';$('start').disabled=true;};
async function command(action,payload={}){try{const response=await fetch(`/api/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const body=await response.json();if(!response.ok)throw new Error(body.error);render(body);}catch(error){$('status').textContent=error.message;}}
$('scenario').onchange=()=>command('scenario',{scenario:$('scenario').value});
$('camera').onchange=()=>command('camera',{mode:$('camera').value});
$('restart').onclick=()=>command('restart');
$('build-test').onclick=()=>command('build-test');
$('start').onclick=()=>command('start');$('pause').onclick=()=>command('pause');
let recorder, stream;
$('record').onclick=async()=>{
  if(recorder?.state==='recording'){recorder.stop();return;}
  try{
    stream=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:30},audio:false,preferCurrentTab:true});
    const chunks=[];
    const mimeType=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';
    recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:8000000});
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());const url=URL.createObjectURL(new Blob(chunks,{type:mimeType}));const a=document.createElement('a');a.href=url;a.download=`typesafe-minecraft-${Date.now()}.webm`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);$('record').textContent='Record tab';$('record-status').textContent='Recording saved as WebM.';};
    stream.getVideoTracks()[0].onended=()=>{if(recorder.state==='recording')recorder.stop();};
    recorder.start(1000);$('record').textContent='Stop recording';$('record-status').textContent='Recording the surface you selected. Stop to save.';
  }catch(error){stream?.getTracks().forEach(t=>t.stop());$('record-status').textContent=`Recording not started: ${error.message}`;}
};

for(const [buttonId,sourceId] of [['copy-input','input-raw'],['copy-output','raw']]){
  const button=$(buttonId);
  button.onclick=async event=>{
    event.preventDefault();event.stopPropagation();
    const text=$(sourceId).textContent;
    try{await navigator.clipboard.writeText(text);button.textContent='Copied!';button.title='JSON copied to clipboard';}
    catch(error){button.textContent='Copy failed';button.title='Clipboard access was denied. Expand the JSON and select it to copy manually.';}
    clearTimeout(button.copyTimer);button.copyTimer=setTimeout(()=>{button.textContent='Copy';},1800);
  };
}
