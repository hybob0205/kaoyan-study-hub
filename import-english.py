"""Import public English II exam statements; detailed solutions stay at the source."""
import json
import re
import urllib.request
from pathlib import Path
from urllib.parse import urljoin
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'dist' / 'english-papers.js'
BASE = 'https://www.csgraduates.com/study_methods/english/english2/'

def section(h):
    nodes = []
    for n in h.next_siblings:
        if getattr(n, 'name', '') in ['h1','h2','h3','h4','h5']: break
        if getattr(n, 'name', None): nodes.append(str(n))
    return BeautifulSoup(''.join(nodes), 'html.parser')

def clean(s, url):
    s = BeautifulSoup(str(s), 'html.parser')
    for n in s.select('.choice-container,.answer-container,.solution-detail,.explanation,script,style,iframe,object,embed,form,button'):
        n.decompose()
    for n in s.select('.katex'):
        text = n.get_text('',strip=True).replace('\u200b','')
        n.replace_with(' __'+text+'__ ')
    allowed = {'p','br','strong','b','em','i','u','ol','ul','li','table','thead','tbody','tr','th','td','img','sup','sub','blockquote'}
    for n in list(s.find_all(True)):
        if n.name not in allowed: n.unwrap(); continue
        attrs = {}
        if n.name == 'ol' and str(n.get('start','')).isdigit(): attrs['start']=n['start']
        if n.name in ['td','th']:
            for key in ['colspan','rowspan']:
                if str(n.get(key,'')).isdigit(): attrs[key]=n[key]
        if n.name == 'img':
            src=urljoin(url,n.get('src',''))
            if not src.startswith('https://'): n.decompose(); continue
            attrs={'src':src,'alt':n.get('alt') or '原题附图（需联网）','loading':'lazy'}
        n.attrs=attrs
    return str(s)

def parse(year):
    url=BASE+str(year)+'/'
    req=urllib.request.Request(url,headers={'User-Agent':'PersonalStudy/1.0'})
    with urllib.request.urlopen(req,timeout=30) as response:
        soup=BeautifulSoup(response.read(),'html.parser')
    main=soup.select_one('main')
    questions={}
    for n in range(1,41):
        h=main.find(id=str(n)); assert h, (year,n)
        part=section(h); box=part.select_one('.choice-container'); assert box,(year,n)
        options=[o.get_text(' ',strip=True) for o in box.select('.choice-text')]
        answer=box.get('data-answer','')
        assert len(options)==4 and answer in 'ABCD' and len(answer)==1,(year,n)
        questions[n]={'id':f'en-{year}-{n}','number':str(n),'prompt':clean(part,url) or f'Choose the best word for blank {n}.','options':options,'answer':answer,'points':0.5 if n<=20 else 2}
    groups=[]
    for anchor,kind,title,nums in [('text','cloze','完形填空',range(1,21))]+[(f'text-{i}','reading',f'阅读 Text {i}',range(16+i*5,21+i*5)) for i in range(1,5)]:
        h=main.find(id=anchor) or main.find(id=anchor.replace('-',''));assert h,(year,anchor)
        body=clean(section(h),url)
        assert len(BeautifulSoup(body,'html.parser').get_text())>500,(year,anchor,'missing passage')
        groups.append({'id':f'en-{year}-{anchor}','year':year,'kind':kind,'title':title,'body':body,'questions':[questions[n] for n in nums],'source':url+'#'+h['id']})
    for anchor,kind,title,points in [('41-45','matching','新题型 · 41—45',10),('46','translation','英译汉',15),('47','letter','小作文',10),('48','essay','大作文',15)]:
        h=main.find(id=anchor);assert h,(year,anchor)
        body=clean(section(h),url);assert len(body)>80,(year,anchor)
        prompt='按 41—45 顺序填写五个答案；对照原站解析，每小题 2 分，总计 10 分。' if kind=='matching' else '独立完成后，对照参考内容自评。'
        q={'id':f'en-{year}-{anchor}','number':anchor,'prompt':prompt,'points':points,'options':[],'answer':''}
        groups.append({'id':f'en-{year}-{kind}','year':year,'kind':kind,'title':title,'body':body,'questions':[q],'source':url+'#'+anchor})
    assert len(groups)==9 and sum(q['points'] for g in groups for q in g['questions'])==100
    return groups

if __name__=='__main__':
    groups=[]
    if OUT.exists():groups=json.loads(OUT.read_text().removeprefix('window.ENGLISH_PAPERS=').strip().removesuffix(';'))['groups']
    failures=[]
    for year in range(2010,2026):
        if len([g for g in groups if g['year']==year])==9:continue
        try:
            imported=parse(year);groups=[g for g in groups if g['year']!=year]+imported
            print(f'{year}: 9 complete sections / 100 points',flush=True)
        except Exception as e:
            failures.append({'year':year,'error':str(e)});print(f'{year}: FAILED {e}',flush=True)
    payload={'source':BASE,'retrieved':'2026-09-19','groups':groups,'failures':failures,'excluded':[{'year':2026,'reason':'来源页新题型的人名、原文和解析存在不一致，暂不作为本站练习卷收录。'}]}
    OUT.write_text('window.ENGLISH_PAPERS='+json.dumps(payload,ensure_ascii=False)+';\n',encoding='utf-8')
    print(f'Total: {len(groups)} sections. Failures: {failures}',flush=True)
