from pathlib import Path
import json,hashlib,base64,html,re
root=Path(__file__).parent
app=(root/'app.js').read_text().rstrip()
assert app.endswith('home();')
backend=(root/'backend-url.txt').read_text().strip() if (root/'backend-url.txt').exists() else ''
if backend:
    from urllib.parse import urlparse
    parsed=urlparse(backend)
    assert parsed.scheme=='https' and parsed.netloc and parsed.path in ('','/') and not parsed.query and not parsed.fragment and not parsed.username
    backend=parsed.scheme+'://'+parsed.netloc
app=app[:-len('home();')]+(root/'expanded.js').read_text()+'\n'+(root/'placement.js').read_text()+'\n'+(root/'connected.js').read_text().replace('/*BACKEND_URL*/',json.dumps(backend))+'\n'+(root/'guided.js').read_text()+'\nhome();\n'
app=app.replace('/*CONTENT_DATA*/',json.dumps(json.loads((root/'content.json').read_text()),separators=(',',':')))
if (root/'audio-data.json').exists():
    audio=(root/'audio-data.json').read_text()
else:
    audio=re.search(r'const AUDIO=(.*?);\nconst app=',(root/'index.html').read_text(),re.S).group(1)
    json.loads(audio)
if (root/'placement-audio.json').exists():
    bank=json.loads(audio);extra=json.loads((root/'placement-audio.json').read_text());bank['lookup'].update(extra['lookup']);bank['clips'].update(extra['clips']);audio=json.dumps(bank,separators=(',',':'))
app=app.replace('/*AUDIO_DATA*/',audio)
license=(root/'audio-license.txt').read_text()
app=app.replace('/*AUDIO_CREDIT*/',html.escape(license).replace('`','&#96;').replace('${','&#36;{'))
app=app.replace('Reading Room · version 1.0','Reading Room · version 2.0')
shell=(root/'shell.html').read_text().replace('/*APP_SCRIPT*/',app)
if backend: shell=shell.replace("connect-src 'none'",'connect-src '+backend)
script='\n'+app+'\n'
digest=base64.b64encode(hashlib.sha256(script.encode()).digest()).decode()
shell=shell.replace('SCRIPT_HASH',"'sha256-"+digest+"'")
(root/'index.html').write_text(shell)
Path('/tmp/reading-built-script.js').write_text(app)
print({'htmlBytes':(root/'index.html').stat().st_size,'scriptCSPHash':digest})
