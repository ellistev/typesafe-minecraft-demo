const lumber=require('./task.cjs');
const flag=require('./flag.cjs');
const scenarios=[
 {id:'lumber',name:'Lumber Run',available:true,description:'Gather 10 new logs and return home.',objective:lumber.OBJECTIVE,budgetMs:300000,decisionLimit:120,actionMs:20000},
 {id:'flag',name:'Canadian Flag',available:true,description:'Mine red and white wool, then build a 26 x 13 maple-leaf flag.',objective:flag.OBJECTIVE,budgetMs:flag.BUDGET_MS,decisionLimit:300,actionMs:45000},
 {id:'cabin',name:'Starter Cabin',available:false,description:'Coming next: gather, craft, build, inspect.'}
];
function scenarioFor(id){const s=scenarios.find(s=>s.id===id);if(!s||!s.available)throw new Error('Choose an available scenario: Lumber Run or Canadian Flag.');return s;}
const apiFor=id=>id==='flag'?flag:lumber;
module.exports={scenarios,scenarioFor,apiFor};
