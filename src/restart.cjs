// Drain the cancelled run before a fresh reset can mutate shared world/task state.
async function afterPreviousRun(previous,canStart,start){
 if(previous)await previous;
 if(canStart())await start();
}
module.exports={afterPreviousRun};
