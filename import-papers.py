"""Import exam statements/short answers, leaving third-party explanations at source."""
import json
import re
import time
import urllib.request
from pathlib import Path
from urllib.parse import urljoin
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'dist'
BASE = 'https://www.csgraduates.com/study_methods/math/math2/'

def clean(nodes, url):
    soup = BeautifulSoup(''.join(str(n) for n in nodes), 'html.parser')
    for n in soup.select('script, iframe, object, embed, button, input, form, style, link'):
        n.decompose()
    for n in soup.find_all(True):
        for key in list(n.attrs):
            if key.lower().startswith('on') or key in ['id', 'srcdoc']:
                del n.attrs[key]
        if n.name == 'a':
            href = urljoin(url, n.get('href', ''))
            if href.startswith('https://'):
                n['href'], n['target'], n['rel'] = href, '_blank', 'noopener noreferrer'
            else:
                n.unwrap()
        elif n.name == 'img':
            n['src'] = urljoin(url, n.get('src', ''))
            n['alt'] = n.get('alt', '原题附图')
            n['loading'] = 'lazy'
    return str(soup)

def chapter(tags):
    s = ','.join(tags)
    if '线性代数' in s:
        for word, cid in [('二次型','quadratic'),('特征','eigen'),('方程组','system'),('向量','vectors'),('行列式','determinant')]:
            if word in s: return cid
        return 'matrix'
    for word, cid in [('微分方程','ode'),('多元函数积分','double'),('二重积分','double'),('多元函数微分','partial'),('一元函数积分','integral'),('一元函数微分','derivative')]:
        if word in s: return cid
    return 'limit'

def parse(year):
    url = BASE + str(year) + '/'
    req = urllib.request.Request(url, headers={'User-Agent': 'Math2PersonalStudy/1.0'})
    with urllib.request.urlopen(req, timeout=35) as res:
        soup = BeautifulSoup(res.read(), 'html.parser')
    questions = []
    for h in soup.select('h5[id]'):
        if not re.fullmatch(r'\d+', h.get('id', '')): continue
        number = int(h['id'])
        nodes = []
        for n in h.next_siblings:
            if getattr(n, 'name', None) in ['h1','h2','h3','h4','h5']: break
            if getattr(n, 'name', None): nodes.append(n)
        section = BeautifulSoup(''.join(str(n) for n in nodes), 'html.parser')
        box = section.select_one('.choice-container, .answer-container')
        detail = section.select_one('.solution-detail')
        if box is None: continue
        is_choice = 'choice-container' in box.get('class', [])
        tags = box.get('data-tags', '').split(',')
        options = [clean([o], url) for o in box.select('.choice-text')] if is_choice else []
        if is_choice and not options and len(box.select('.choice-option-inline')) == 4:
            options = ['见题干选项 ' + c for c in 'ABCD']
        qtype = 'choice' if is_choice else ('fill' if number <= (16 if year >= 2021 else 14) else 'written')
        answer = box.get('data-answer', '') if is_choice else ''
        # Only mathematical final answers are included; explanatory prose remains at the source.
        answer_html = ''
        if detail and qtype == 'fill':
            p = detail.find('p')
            if p and '答案' in p.get_text() and '解析' not in p.get_text():
                answer_html = clean([p], url)
        for n in section.select('.choice-container, .answer-container, .solution-detail, .quiz-tag-container'):
            if n.parent: n.decompose()
        body = clean(section.contents, url)
        score = 5 if year >= 2021 and qtype != 'written' else 4
        if qtype == 'written':
            match = re.search(r'满分\s*(\d+)\s*分', BeautifulSoup(body,'html.parser').get_text(' ',strip=True))
            score = int(match[1]) if match else (10 if number == 17 and year >= 2021 else 12 if year >= 2021 else 10)
        questions.append(dict(id=f'real-{year}-{number}', year=year, number=number, type=qtype, chapter=chapter(tags), tags=tags,
            body=body, options=options, answer=answer, answerHtml=answer_html, points=score, source=url+'#'+str(number),
            origin='历年真题', explanation='', searchText=BeautifulSoup(body,'html.parser').get_text(' ',strip=True)))
    expected = 22 if year >= 2021 else 23
    if len(questions) != expected:
        raise ValueError(f'{year}: {len(questions)} / {expected}; no partial paper saved')
    assert all(q['body'] and (q['type'] != 'choice' or len(q['options']) == 4 and q['answer'] in 'ABCD') for q in questions)
    return questions

if __name__ == '__main__':
    all_questions, failures = [], []
    previous = OUT/'papers.js'
    if previous.exists():
        prior = json.loads(previous.read_text(encoding='utf-8').removeprefix('window.PAPERS=').strip().removesuffix(';'))
        all_questions = prior['questions']
    complete = {q['year'] for q in all_questions}
    for year in range(2026, 2007, -1):
        if year in complete: continue
        try:
            qs = parse(year)
            all_questions.extend(qs)
            print(f'{year}: {len(qs)} questions', flush=True)
        except Exception as exc:
            failures.append({'year':year,'error':str(exc)})
            print(f'{year}: FAILED {exc}', flush=True)
        time.sleep(.15)
    # Correct source tags, including already cached questions.
    corrections = {'real-2023-20':'double', 'real-2023-22':'eigen'}
    for q in all_questions:
        if q['id'] in corrections: q['chapter'] = corrections[q['id']]
    payload = {'retrieved':'2026-09-19','source':BASE,'questions':all_questions,'failures':failures}
    (OUT/'papers.js').write_text('window.PAPERS='+json.dumps(payload,ensure_ascii=False)+';\n',encoding='utf-8')
    print(f'Total {len(all_questions)} questions. Failed: {failures}', flush=True)
