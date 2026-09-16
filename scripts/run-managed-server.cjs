// Run an already configured, explicitly EULA-accepted isolated Survival server.
// The local command mailbox is for trusted operator setup and the fixed replay adapter.
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'runtime/survival');
const properties=fs.readFileSync(path.join(dir,'server.properties'),'utf8');
if(!/^eula=true\s*$/m.test(fs.readFileSync(path.join(dir,'eula.txt'),'utf8')))throw new Error('Explicit EULA acceptance is required.');
if(!/^server-ip=127\.0\.0\.1\s*$/m.test(properties)||!/^server-port=25576\s*$/m.test(properties))throw new Error('Managed replay requires the isolated loopback server on port 25576.');
const output=fs.openSync(path.join(root,'runtime/survival-console.log'),'a');
const child=spawn(process.env.JAVA_BIN||'java',['-Xms512M','-Xmx2G','-jar',path.join(root,'runtime/server/server.jar'),'nogui'],{cwd:dir,windowsHide:true,stdio:['pipe',output,output]});
fs.writeFileSync(path.join(root,'runtime/survival.pid'),String(child.pid));
const mailbox=path.join(root,'runtime/server-command.txt');
const timer=setInterval(()=>{if(fs.existsSync(mailbox)){const command=fs.readFileSync(mailbox,'utf8');fs.unlinkSync(mailbox);child.stdin.write(command.trim()+'\n');}},250);
child.on('error',error=>{clearInterval(timer);console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{clearInterval(timer);fs.closeSync(output);process.exitCode=code||0;});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{clearInterval(timer);child.stdin.write('stop\n');});
