const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={window:{}};vm.createContext(ctx);
for(const file of ['papers.js','data.js'])vm.runInContext(fs.readFileSync('dist/'+file,'utf8'),ctx);
const d=ctx.window.STUDY,p=ctx.window.PAPERS,all=[...p.questions,...d.questions];
assert.equal(p.questions.length,431);assert.equal(d.questions.length,100);assert.equal(d.mocks.length,4);assert.equal(d.chapters.length,12);assert.equal(d.methods.length,8);
assert.equal(new Set(all.map(q=>q.id)).size,all.length);
assert.equal(p.questions.find(q=>q.id==='real-2023-20').chapter,'double');
assert.equal(p.questions.find(q=>q.id==='real-2023-22').chapter,'eigen');
for(let y=2008;y<=2026;y++)assert.equal(p.questions.filter(q=>q.year===y).length,y>=2021?22:23);
for(const q of all){assert(q.body.length>5,q.id);assert(d.chapters.some(c=>c.id===q.chapter),q.id);assert(!/【解析】|查看答案与解析|<script|onclick=/i.test(q.body),q.id);if(q.type==='choice'){assert.equal(q.options.length,4,q.id);assert.match(q.answer,/^[ABCD]$/,q.id);}}
for(const m of d.mocks){const qs=d.questions.filter(q=>q.mock===m.id);assert.equal(qs.length,22);assert.equal(qs.reduce((s,q)=>s+q.points,0),150);assert.equal(qs.filter(q=>q.type==='choice').length,10);assert.equal(qs.filter(q=>q.type==='fill').length,6);assert.equal(qs.filter(q=>q.type==='written').length,6);}
const katex=require('./dist/vendor/katex/katex.js');let formulas=0;
for(const obj of [...d.questions,...d.chapters,...d.methods])for(const val of Object.values(obj))for(const txt of Array.isArray(val)?val:[val])if(typeof txt==='string')for(const match of txt.matchAll(/\\\(([\s\S]*?)\\\)/g)){katex.renderToString(match[1].replaceAll('&lt;','<'),{throwOnError:true});formulas++;}
for(const src of [...fs.readFileSync('dist/index.html','utf8').matchAll(/(?:src|href)="([^"#]+)"/g)].map(m=>m[1]))if(!src.startsWith('data:')&&!src.includes('://'))assert(fs.existsSync('dist/'+src.split('?')[0]),src);
console.log(`PASS: ${all.length} questions, 19 complete years, ${d.mocks.length} × 150-point mocks, ${formulas} formulas, assets present.`);
