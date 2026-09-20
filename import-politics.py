"""Import public postgraduate-politics objective questions; source explanations stay online."""
import json
import re
import urllib.request
from datetime import date
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'dist' / 'politics-papers.js'
BASE = 'https://zhenti.zalize.com/zhenti/'


def parse_year(year):
    url = BASE + str(year)
    request = urllib.request.Request(url, headers={'User-Agent': 'PersonalStudy/1.0'})
    with urllib.request.urlopen(request, timeout=30) as response:
        soup = BeautifulSoup(response.read(), 'html.parser')
    questions = []
    for article in soup.select('article[id^="q"]'):
        match = re.fullmatch(r'q(\d+)', article.get('id', ''))
        if not match or not 1 <= int(match.group(1)) <= 33:
            continue
        number = int(match.group(1))
        direct_paragraphs = article.find_all('p', recursive=False)
        if len(direct_paragraphs) < 2:
            continue
        meta = [part.strip() for part in direct_paragraphs[0].get_text(' ', strip=True).split('·')]
        kind = 'multiple' if any('多选' in part for part in meta) else 'single'
        subject = next((part for part in meta if part in {'马原', '毛中特', '史纲', '思修法基', '形势与政策'}), '其他')
        if subject == '马原':
            subject = '马原·哲学'
        subject_index = meta.index(subject) if subject in meta else -1
        if subject == '马原·哲学' and '马原' in meta:
            subject_index = meta.index('马原') + (1 if subject_index < 0 else 0)
        topic = meta[subject_index + 1] if subject_index >= 0 and subject_index + 1 < len(meta) else '综合考点'
        topic = topic.replace('本题详页 ›', '').strip() or '综合考点'
        options, answer = [], []
        for option in article.select('.stopt'):
            text = option.get_text(' ', strip=True).lstrip('✓').strip()
            option_match = re.match(r'([A-D])\.\s*(.*)', text, re.S)
            if not option_match:
                continue
            letter, body = option_match.groups()
            options.append(body.strip())
            if option.get('data-ok') == '1':
                answer.append(letter)
        if len(options) != 4 or not answer:
            continue
        detail = article.select_one('a[href*="/zhenti/"]')
        source = 'https://zhenti.zalize.com' + detail['href'] if detail and detail.get('href', '').startswith('/') else f'{url}#q{number}'
        questions.append({
            'id': f'pol-{year}-{number}',
            'year': year,
            'number': number,
            'type': kind,
            'subject': subject,
            'topic': topic,
            'prompt': direct_paragraphs[1].get_text(' ', strip=True),
            'options': options,
            'answer': ''.join(answer),
            'source': source,
        })
    if len(questions) < 28:
        raise RuntimeError(f'{year}: only {len(questions)} objective questions parsed')
    return questions


if __name__ == '__main__':
    questions, failures = [], []
    for year in range(2010, 2027):
        try:
            imported = parse_year(year)
            questions.extend(imported)
            print(f'{year}: {len(imported)} objective questions', flush=True)
        except Exception as exc:
            failures.append({'year': year, 'error': str(exc)})
            print(f'{year}: FAILED {exc}', flush=True)
    assert len({q['id'] for q in questions}) == len(questions)
    payload = {
        'source': BASE,
        'retrieved': date.today().isoformat(),
        'questions': questions,
        'failures': failures,
        'notice': '仅整理公开真题题干、选项、答案与考点标签；来源站原创解析未复制，请从每题链接阅读。',
    }
    OUT.write_text('window.POLITICS_PAPERS=' + json.dumps(payload, ensure_ascii=False) + ';\n', encoding='utf-8')
    print(f'Total: {len(questions)} objective questions. Failures: {failures}', flush=True)
