// Exercise the actual storage and backup validator without touching browser records.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('dist/app.js','utf8');
const setup=source.slice(source.indexOf('const blank='),source.indexOf('const esc='));
const save=source.slice(source.indexOf('function save()'),source.indexOf('function toast('));
function run(raw,fail=false){
 const ctx={KEY:'test',byId:new Map([['exercise-1',{}]]),D:{mocks:[],methods:[],chapters:[]},toast(){},localStorage:{getItem:()=>raw,setItem(){if(fail)throw Error('quota');}}};
 vm.createContext(ctx);vm.runInContext(setup+save,ctx);return code=>vm.runInContext(code,ctx);
}
const record=JSON.stringify({version:1,records:{'exercise-1':{notes:'old'}},exams:{},read:[]});
const quota=run(record,true);
quota("state.records['exercise-1'].notes='new';save()");
assert.equal(quota('recoveryRaw'),null);
assert.equal(quota("JSON.parse(recoveryRaw||JSON.stringify(state)).records['exercise-1'].notes"),'new');
const corrupt=run('{broken');assert.equal(corrupt('recoveryRaw'),'{broken');assert.equal(corrupt('save()'),false);
const valid=run(record);assert.equal(valid('save()'),true);assert.equal(valid('validate(JSON.parse(JSON.stringify(state))).records["exercise-1"].notes'),'old');
assert.throws(()=>valid('validate({version:2})'));
console.log('PASS: current-state quota backup, corrupt-record recovery, valid roundtrip, invalid backup rejection.');
