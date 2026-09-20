const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={window:{}};vm.createContext(context);
for(const name of ['english-content.js','english-mocks.js','english-papers.js','english-app.js'])vm.runInContext(fs.readFileSync('dist/'+name,'utf8'),context);
const d=context.window.ENGLISH,p=context.window.ENGLISH_PAPERS,core=context.window.ENGLISH_CORE;
const all=[...d.groups,...p.groups],qs=all.flatMap(g=>g.questions);
assert.equal(p.groups.length,144);assert.equal(d.methods.length,8);assert.equal(d.guides.length,6);assert.equal(d.words.length,24);assert.equal(d.groups.filter(g=>!g.mock).length,7);
assert.equal(new Set(all.map(g=>g.id)).size,all.length);assert.equal(new Set(qs.map(q=>q.id)).size,qs.length);
for(let year=2010;year<=2025;year++){
 const gs=p.groups.filter(g=>g.year===year);assert.equal(gs.length,9);assert.equal(gs.flatMap(g=>g.questions).length,44);assert.equal(gs.flatMap(g=>g.questions).reduce((s,q)=>s+q.points,0),100);
 assert.equal(gs.filter(g=>g.kind==='reading').length,4);
 for(const g of gs)assert(g.source.startsWith(p.source));
}
for(const g of all){assert(g.body.length>60,g.id);assert(!/<script|onclick=|<iframe|正确答案|【解析】/.test(g.body),g.id);for(const q of g.questions){assert(q.prompt.trim(),q.id);assert(q.points>0,q.id);if(q.options.length){assert(q.options.length>=4);assert('ABCDEFG'.indexOf(q.answer)>=0);assert('ABCDEFG'.indexOf(q.answer)<q.options.length);assert.equal(new Set(q.options).size,q.options.length,q.id);}}}
for(const m of d.mocks){const gs=d.groups.filter(g=>g.mock===m.id),list=gs.flatMap(g=>g.questions);assert.equal(gs.length,9);assert.equal(list.length,48);assert.equal(list.reduce((s,q)=>s+q.points,0),100);assert.equal(list.filter(q=>q.options.length).length,45);
 const e={answers:{},grades:{}};for(const q of list)if(q.options.length)e.answers[q.id]=q.answer;else e.grades[q.id]=q.points;
 assert.equal(core.score(m.id,e).points,100);assert.equal(core.score(m.id,e).pending,0);delete e.grades[m.id+'-q48'];assert.equal(core.score(m.id,e).pending,1);
 const cloze=gs.find(g=>g.kind==='cloze').body;for(let n=1;n<=20;n++)assert(cloze.includes('__'+n+'__'),m.id+' missing blank '+n);
 console.log(m.id,'reading word counts:',gs.filter(g=>g.kind==='reading').map(g=>g.body.replace(/<[^>]*>/g,' ').split(/\s+/).filter(Boolean).length).join(', '));
}
const s=core.blank();s.records['warm-reading-q1']={answer:'B',notes:'some ≠ all',favorite:true};s.records['warm-letter-q1']={answer:'Dear Alex...',aiReviewedAnswer:'Dear Alex...',aiReview:{score:7.5,max_score:10,summary:'任务基本完成',strengths:['格式正确'],issues:['细节不足'],revised_example:'Dear Alex, ...',disclaimer:'untrusted',model:'gpt-5.6-luna'}};s.records.unknown={};s.words=[{id:'custom-test',term:'address',meaning:'处理',example:'Address the problem.'}];s.vocab['custom-test']={status:'mastered',due:42};s.exams['mock-a']={start:1000,end:5000,pausedAt:3000,submitted:false,answers:{'mock-a-q1':'B'},grades:{'mock-a-q46':99,'mock-a-q48':12.5}};
const out=core.validate(JSON.parse(JSON.stringify(s)));assert.equal(out.records['warm-reading-q1'].notes,'some ≠ all');assert.equal(out.records['warm-letter-q1'].aiReview.score,7.5);assert.equal(out.records['warm-letter-q1'].aiReview.disclaimer,'AI参考评阅，不是官方成绩。');assert(!out.records.unknown);assert.equal(out.words[0].term,'address');assert.equal(out.vocab['custom-test'].due,42);assert.equal(out.exams['mock-a'].end,5000);assert.equal(out.exams['mock-a'].pausedAt,3000);assert(!('mock-a-q46' in out.exams['mock-a'].grades));assert.equal(out.exams['mock-a'].grades['mock-a-q48'],12.5);
assert.throws(()=>core.validate({version:1,records:{},exams:{},read:[]}));assert.throws(()=>core.validate({...s,subject:'math2'}));
for(const entry of ['index.html','english.html'])for(const [,src] of fs.readFileSync('dist/'+entry,'utf8').matchAll(/(?:src|href)="([^"#]+)"/g)){assert.notEqual(src,'/',entry+' contains a device-root link');if(src.startsWith('data:')||src.includes('://'))continue;assert(fs.existsSync('dist/'+src.split('?')[0]),src);}
assert(fs.readFileSync('dist/app.js','utf8').includes("KEY='math2-study-v1'"));
console.log(`PASS: ${p.groups.length} real units, ${qs.length} response items including originals, 2 × 100-point mocks, content and independent backup validation.`);
