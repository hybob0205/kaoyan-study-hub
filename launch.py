"""Launch the local, static study website."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import urllib.request
import webbrowser

URL = 'http://127.0.0.1:8767/'
ROOT = Path(__file__).resolve().parent / 'dist'


def run():
    handler = partial(SimpleHTTPRequestHandler, directory=str(ROOT))
    try:
        server = ThreadingHTTPServer(('127.0.0.1', 8767), handler)
    except OSError:
        try:
            with urllib.request.urlopen(URL, timeout=2) as response:
                if '考研研习室' not in response.read().decode('utf-8'):
                    raise RuntimeError('8767 端口被其他程序占用。请先关闭那个程序再启动。')
            if not os.environ.get('STUDY_NO_BROWSER'):
                webbrowser.open(URL)
            print('考研研习室已经运行，已打开页面。')
        except Exception as exc:
            print('无法启动：', exc)
            input('按回车退出。')
        return

    print(f'考研研习室已启动：{URL}\n保持本窗口打开。停止请按 Control+C。')
    if not os.environ.get('STUDY_NO_BROWSER'):
        webbrowser.open(URL)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()


if __name__ == '__main__':
    run()
