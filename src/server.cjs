const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const express = require('express');
const { Server } = require('socket.io');
const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');
const lumber = require('./task.cjs');
const {afterPreviousRun}=require('./restart.cjs');
const {resetFlag,shouldStartFresh}=require('./flag-reset.cjs');
const {scenarios,scenarioFor,apiFor}=require('./scenarios.cjs');
const {actionsFor}=require('./decisions.cjs');
let scenario=scenarioFor('lumber');
let taskApi=apiFor(scenario.id);
let camera='player';
const { WorldView } = require('prismarine-viewer/viewer/lib/worldView');
const { decide, isFresh } = require('./decisions.cjs');
const { observe, point } = require('./observe.cjs');
const { setTimeout: delay } = require('node:timers/promises');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { path: '/view/socket.io' });
const port = Number(process.env.PORT || 3010);
const viewers = new Set();
let bot, ready = false, running = false, generation = 0, controller, activeLoop = null, restarting = false;
let goal = taskApi.OBJECTIVE, task = null;
let history = [], latest = null, count = 0, status = 'Waiting for Minecraft';
fs.mkdirSync(path.join(__dirname,'../runtime'), { recursive: true });
const logFile = path.join(__dirname, '../runtime', `decisions-${Date.now()}.jsonl`);
const clients = new Set();
let connecting = false, connectedPort = Number(process.env.MC_PORT || 25575);
function snapshot() { return { scenarios, scenario:scenario.id, actionLabels:Object.fromEntries(Object.keys(actionsFor({scenario:scenario.id})).map(k=>[k,k.replaceAll('_',' ')])), camera, restarting, busy:running||!!activeLoop, ready, running, status, goal, count, latest, gamePort:connectedPort, task:ready&&task?taskApi.progress(bot,task):null, position: ready ? point(bot.entity.position) : null, keyConfigured: !!process.env.TYPESAFE_API_KEY }; }
function broadcast() { const data = `data: ${JSON.stringify(snapshot())}\n\n`; for (const res of clients) res.write(data); }
function pause(reason = 'Paused') { running = false; generation++; controller?.abort(); if(bot)lumber.cancel(bot); if(task && reason!=='Paused')task.finishedAt??=Date.now(); status = reason; broadcast(); }
app.use(express.json({ limit:'4kb' }));
app.get('/api/state', (req,res) => res.json(snapshot()));
app.get('/api/events', (req,res) => { res.set({'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'}); res.flushHeaders(); clients.add(res); res.write(`data: ${JSON.stringify(snapshot())}\n\n`); req.on('close',()=>clients.delete(res)); });
app.post('/api/:action', (req,res) => {
  if (req.headers.origin && req.headers.origin !== `http://127.0.0.1:${port}` && req.headers.origin !== `http://localhost:${port}`) return res.sendStatus(403);
  if(req.params.action==='restart'){
    if(!ready||!process.env.TYPESAFE_API_KEY)return res.status(409).json({error:'Minecraft and a TypeSafe key must be ready.'});
    if(restarting||(running&&!task))return res.status(409).json({error:'A reset is already in progress.'});
    if(bot.game.gameMode!=='survival')return res.status(409).json({error:'This task requires Survival mode.'});
    const previous=activeLoop;
    restarting=true;pause('Stopping current task to restart');
    running=true;const token=++generation;
    trackRun(afterPreviousRun(previous,()=>running&&generation===token&&ready,()=>startRun(token,true)));
    broadcast();return res.json(snapshot());
  }
  if(req.params.action==='camera') {
    if(!['player','overview'].includes(req.body.mode))return res.status(400).json({error:'Unknown camera mode'});
    if(req.body.mode==='overview'&&(!task||scenario.id!=='flag'))return res.status(409).json({error:'Start a flag task first.'});
    camera=req.body.mode;for(const socket of viewers)socket.data.updateCamera?.();broadcast();return res.json(snapshot());
  }
  if(req.params.action==='scenario') {
    if(running||activeLoop)return res.status(409).json({error:'Pause the current task before switching scenarios.'});
    try{scenario=scenarioFor(req.body.scenario);}catch(error){return res.status(400).json({error:error.message});}
    taskApi=apiFor(scenario.id);goal=scenario.objective;task=null;latest=null;history=[];count=0;camera='player';
    if(bot?.pathfinder?.movements)bot.pathfinder.movements.canDig=scenario.id==='lumber';
    for(const socket of viewers)socket.data.updateCamera?.();status='Scenario selected. Press Start task.';broadcast();return res.json(snapshot());
  }
  if (req.params.action === 'pause') { pause(); return res.json(snapshot()); }
  if (req.params.action === 'connect') {
    const gamePort = Number(req.body.port);
    if (!Number.isInteger(gamePort) || gamePort < 1024 || gamePort > 65535) return res.status(400).json({error:'Enter the Minecraft LAN port (1024-65535).'});
    if (running || activeLoop || connecting || ready) return res.status(409).json({error:'Pause and restart the demo before changing an active Minecraft connection.'});
    connect(gamePort); return res.json(snapshot());
  }
  if (req.params.action !== 'start') return res.sendStatus(404);
  if (!ready || !process.env.TYPESAFE_API_KEY) return res.status(409).json({ error:'Minecraft and a TypeSafe key must be ready.' });
  if (running || activeLoop) return res.status(409).json({ error:'A run is already active or stopping.' });
  if(bot.game.gameMode !== 'survival')return res.status(409).json({error:'This task requires Survival mode so mined logs drop as items.'});
  const fresh=shouldStartFresh(task,task?taskApi.progress(bot,task):null,scenario.budgetMs);
  running = true; status = fresh&&scenario.id==='flag'?'Resetting flag and replenishing materials':'Observing';
  const myGeneration = ++generation;
  trackRun(startRun(myGeneration,fresh));
  broadcast(); res.json(snapshot());
});
app.use('/view', express.static(path.join(path.dirname(require.resolve('prismarine-viewer')), 'public')));
app.use(express.static(path.join(__dirname, '../public')));

function attachViewer(socket) {
  if (!ready || socket.data.attached) return;
  socket.data.attached = true;
  const player = bot;
  socket.emit('version', player.version);
  const world = new WorldView(player.world, 4, player.entity.position, socket);
  world.listenToBot(player);
  world.init(player.entity.position).catch(() => {});
  const move = () => {
    const overview=camera==='overview'&&scenario.id==='flag'&&task;
    const position=overview?{x:task.origin.x+13,y:task.origin.y+25,z:task.origin.z+20}:player.entity.position;
    socket.emit('position', { pos:position, yaw:overview?0:player.entity.yaw, pitch:overview?-Math.atan2(25,13.5):player.entity.pitch, addMesh:!overview });
    world.updatePosition(player.entity.position).catch(() => {});
  };
  socket.data.updateCamera=move;
  player.on('move', move); move();
  socket.on('disconnect', () => { player.removeListener('move',move); world.removeListenersFromBot(player); });
}
io.on('connection', socket => { viewers.add(socket); attachViewer(socket); socket.on('disconnect',()=>viewers.delete(socket)); });

function trackRun(operation){
  const tracked=operation.finally(()=>{if(activeLoop===tracked){activeLoop=null;restarting=false;}broadcast();});
  activeLoop=tracked;
}
async function startRun(token,fresh){
  try{
    if(fresh){
      history=[];latest=null;count=0;task=null;camera='player';
      status=scenario.id==='flag'?'Resetting flag and replenishing materials':'Starting a fresh task';broadcast();
      if(scenario.id==='flag'){
        const prepared=taskApi.createTask(bot);
        await resetFlag(bot,prepared,{port:connectedPort,host:process.env.MC_HOST||'127.0.0.1'});
      }
      if(!running||generation!==token||!ready)return;
      task=taskApi.createTask(bot);
      for(const socket of viewers)socket.data.updateCamera?.();
    }
    if(!running||generation!==token||!ready)return;
    restarting=false;
    bot.pathfinder.movements.canDig=scenario.id==='lumber';
    await loop(token);
  }catch(error){if(generation===token)pause('Stopped: '+error.message);}
}
async function loop(token) {
  try {
    while (running && generation === token && count < scenario.decisionLimit) {
      const progress = taskApi.progress(bot,task);
      const stop = taskApi.stopReason(progress,task);
      if(stop){if(progress.complete&&scenario.id==='flag'){camera='overview';for(const socket of viewers)socket.data.updateCamera?.();}pause(stop);break;}
      if(bot.health<8)throw new Error('Stopped: health is low');
      const state = observe(bot,goal,history);
      state.scenario=scenario.id;
      state.task = progress;
      state.candidates = taskApi.candidates(bot,task);
      status = 'TypeSafe is deciding'; broadcast();
      controller = new AbortController();
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]);
      const started = Date.now();
      const result = await decide(state,{key:process.env.TYPESAFE_API_KEY,model:process.env.TYPESAFE_MODEL || 'jev-latest',signal});
      if (!running || generation !== token || !ready) break;
      if (!isFresh(state.position,point(bot.entity.position),Date.now()-started)) throw new Error('Observation changed or response was too slow. Paused before moving.');
      count++;
      latest = { id:count, timestamp:new Date().toISOString(), state, ...result, outcome:'Executing' };
      status = `Executing ${result.answer.choice}`; broadcast();
      const actionSignal = AbortSignal.any([controller.signal,AbortSignal.timeout(Math.max(1,Math.min(scenario.actionMs,scenario.budgetMs-Date.now()+task.startedAt)))]);
      const outcome = await taskApi.executeTask(bot,task,result.answer.choice,state.candidates,actionSignal);
      const end = point(bot.entity.position);
      const moved = Math.hypot(end.x-state.position.x,end.z-state.position.z);
      latest.outcome = outcome;
      latest.endPosition = end;
      latest.distanceMoved = +moved.toFixed(2);
      latest.progress = taskApi.progress(bot,task);
      history.push({ action:result.answer.choice, outcome, distanceMoved:latest.distanceMoved, position:end });
      history = history.slice(-12);
      fs.appendFileSync(logFile,JSON.stringify(latest)+'\n');
      broadcast();
      await delay(100);
    }
    if (generation === token) pause(`Stopped: ${scenario.decisionLimit}-decision limit reached`);
  } catch (error) {
    if(latest?.outcome==='Executing') {
      latest.outcome=generation===token?`Stopped: ${error.message}`:'Cancelled';
      latest.endPosition=point(bot.entity.position);latest.progress=taskApi.progress(bot,task);
      fs.appendFileSync(logFile,JSON.stringify(latest)+'\n');
    }
    if (generation === token) pause(`Stopped: ${error.message}`);
    else broadcast();
  }
}

server.listen(port,'127.0.0.1',()=>console.log(`Demo: http://127.0.0.1:${port}`));
function connect(gamePort = Number(process.env.MC_PORT || 25575)) {
  connecting = true;
  connectedPort=gamePort;task=null;
  status = `Connecting to Minecraft on port ${gamePort}`;
  const player = mineflayer.createBot({ host:process.env.MC_HOST || '127.0.0.1',port:gamePort,username:'TypeSafeExplorer',auth:'offline',version:process.env.MC_VERSION || false,hideErrors:true });
  bot = player;
  player.loadPlugin(pathfinder);
  player.once('spawn',async () => {
    try { await player.waitForChunksToLoad(); if (bot !== player) return; lumber.configure(player);player.pathfinder.movements.canDig=scenario.id==='lumber'; connecting = false; ready = true; status = 'Ready. Press Start task.'; for (const socket of viewers) attachViewer(socket); broadcast(); }
    catch(error) { pause(error.message); }
  });
  player.on('error', error => { if(bot !== player)return; connecting = false; status = `Minecraft: ${error.code || error.message}`; broadcast(); });
  player.on('kicked', () => { if(bot === player)pause('Minecraft disconnected the player. Check server log.'); });
  player.on('death',()=>{if(bot === player)pause('Player died');});
  player.on('end',()=>{ if(bot !== player)return; connecting = false; ready = false; pause('No Minecraft world connected. Enter the Java LAN port below.'); for(const socket of viewers) socket.disconnect(true); });
}
status = 'No Minecraft world connected. Enter the Java LAN port below.';
function shutdown() { pause('Shutting down'); bot?.quit(); io.close(); server.close(); setTimeout(()=>process.exit(0),500).unref(); }
process.on('SIGINT',shutdown); process.on('SIGTERM',shutdown);
