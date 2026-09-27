const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const context={window:{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('dist/cs408-data.js','utf8'),context);
const d=context.window.CS408;
assert.equal(d.choices.length,80);
assert.equal(d.written.length,20);
assert.equal(new Set(d.questions.map(q=>q.id)).size,100);
for(const [id] of d.subjects){assert.equal(d.choices.filter(q=>q.subject===id).length,20);assert(d.written.filter(q=>q.subject===id).length>=4);}
for(const q of d.choices){assert.equal(q.options.length,4,q.id);assert.equal(new Set(q.options).size,4,q.id);assert.match(q.answer,/^[ABCD]$/,q.id);assert(q.options['ABCD'.indexOf(q.answer)],q.id);assert(q.explanation.length>=8,q.id);}
for(const q of d.written)assert(q.reference.length>=25,q.id);
for(const m of d.mocks){const qs=d.questions.filter(q=>q.mock===m.id);assert.equal(qs.length,50);assert.equal(qs.filter(q=>q.type==='choice').length,40);assert.equal(qs.filter(q=>q.type==='written').length,10);assert.equal(qs.reduce((sum,q)=>sum+q.points,0),150);}
for(const file of ['index.html','math.html','english.html','politics.html','resources.html'])assert.match(fs.readFileSync('dist/'+file,'utf8'),/href="cs408.html"|href="cs408.html#practice"/,file);
for(const path of ['cs408-data.js','cs408-app.js','cs408.css','custom-records.js','style.css','theme.js'])assert(fs.existsSync('dist/'+path),path);
console.log('PASS: 408 has 100 unique questions, four subjects, two 150-point mocks, and four-subject navigation.');
