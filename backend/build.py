from pathlib import Path
import json, hashlib, base64, re
root=Path(__file__).parent
source=(root/'teacher.html').read_text()
script=re.search(r'<script>(.*?)</script>',source,re.S).group(1)
digest=base64.b64encode(hashlib.sha256(script.encode()).digest()).decode()
csp=f"default-src 'none'; script-src 'sha256-{digest}'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
(root/'teacher-page.js').write_text('export function teacherPage(){return new Response('+json.dumps(source)+', {headers:{"Content-Type":"text/html; charset=utf-8","Content-Security-Policy":'+json.dumps(csp)+'}});}\n')
(root/'catalog.js').write_text('export const CONTENT = '+(root.parent/'content.json').read_text()+';\n')
(root/'placement.js').write_text((root.parent/'placement.js').read_text()+'\nexport { Placement };\n')
print('Teacher dashboard and curriculum catalog generated.')
