"""Offline export verification. Never connects to a browser or starts services."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys


def sha(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for part in iter(lambda:f.read(1024*1024),b''): h.update(part)
    return h.hexdigest()


def verify(root, runtime_root=None, require_runtime=False):
    provenance=json.loads((root/'PROVENANCE.json').read_text(encoding='utf-8'))
    assert provenance['export_schema']=='browser-skill-drag-export/v1'
    for key,prefix in [('source_files','source'),('extension_files','extension')]:
        for relative,wanted in provenance[key].items():
            p=root/prefix/relative
            assert p.resolve().is_relative_to((root/prefix).resolve()) and not p.is_symlink(), relative
            assert sha(p)==wanted, 'Byte mismatch: '+prefix+'/'+relative
    manifest=json.loads((root/'extension/manifest.json').read_text(encoding='utf-8'))
    assert manifest['name']==provenance['extension_name']
    assert manifest['version']==provenance['extension_version']=='0.3.3'
    assert provenance['protocol']=='1.6' and provenance['default_port']==52841
    assert 'ws://127.0.0.1:52841' in (root/'extension/background.js').read_text(encoding='utf-8')
    assert 'Copyright (c) 2026 Tencent' in (root/'LICENSE').read_text(encoding='utf-8')
    assert not provenance['account_state_included'] and not provenance['user_skills_included']
    required=['README.md','UPSTREAM.md','docs/INSTALL.md','docs/BUILD.md','docs/GITHUB.md',
              'tools/bsk-drag.ps1','tools/bsk-drag.cmd','tools/build.ps1','.gitignore','.gitattributes']
    for name in required: assert (root/name).is_file(),name
    wrapper=(root/'tools/bsk-drag.ps1').read_text(encoding='utf-8')
    assert 'BrowserSkillDragStandalone' in wrapper and "BSK_AUTO_START='0'" in wrapper
    assert 'daemon start --port 52841 --foreground' in wrapper
    cmd=(root/'tools/bsk-drag.cmd').read_text(encoding='utf-8')
    assert 'setlocal' in cmd and 'BSK_AUTO_START=0' in cmd
    assert 'BrowserSkillDragStandalone' in cmd and '--port 52841 --foreground' in cmd
    assert '--browser' in (root/'README.md').read_text(encoding='utf-8')
    rules=(root/'.gitignore').read_text(encoding='utf-8').splitlines()
    for entry in ['runtime/','.bsk/','.env','Cookies','Login Data','Preferences']:
        assert entry in rules,entry
    files=[]
    forbidden_names={'Cookies','Login Data','History','Preferences','Secure Preferences','Local State',
                     'daemon.json','profile-mapping.json','AUTHORIZATION.json'}
    secret_patterns=[re.compile(r'gh[pousr]_[A-Za-z0-9]{30,}'),
                     re.compile(r'github_pat_[A-Za-z0-9_]{40,}'),
                     re.compile(r'AKIA[A-Z0-9]{16}'),
                     re.compile(r'sk-(?:proj-)?[A-Za-z0-9_-]{40,}')]
    for p in sorted(root.rglob('*')):
        rel=p.relative_to(root)
        if '.git' in rel.parts or 'node_modules' in rel.parts or 'target' in rel.parts: continue
        if p.is_symlink(): raise AssertionError('Unexpected link: '+str(rel))
        if not p.is_file(): continue
        if rel.parts[0]=='runtime': continue
        files.append(p)
        assert p.name not in forbidden_names and not p.name.startswith('.env'),str(rel)
        assert p.stat().st_size < 100*1024*1024, 'Large Git file: '+str(rel)
        if p.suffix.lower() not in {'.png','.jpg','.jpeg','.gif','.mp4','.webm','.ico','.woff','.woff2','.ttf'}:
            try: body=p.read_text(encoding='utf-8')
            except UnicodeDecodeError: continue
            for pattern in secret_patterns: assert not pattern.search(body),'Secret-like value in '+str(rel)
    inventory=root/'RELEASE_FILES.json'
    if inventory.exists():
        expected=json.loads(inventory.read_text(encoding='utf-8'))
        actual={p.relative_to(root).as_posix():sha(p) for p in files if p!=inventory}
        assert actual==expected,'Public file inventory changed'
    runtime=(runtime_root or root)/'runtime/windows-x64/bsk-drag.exe'
    if require_runtime or runtime.exists():
        assert runtime.is_file(), 'Paired Windows runtime missing'
        assert sha(runtime)==provenance['runtime_sha256'],'Paired runtime mismatch'
    return {'status':'PASS','source_files':len(provenance['source_files']),
            'extension_files':len(provenance['extension_files']),
            'runtime_verified':runtime.exists(),'browser_actions':0}


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1])
    p.add_argument('--runtime-root',type=Path)
    p.add_argument('--require-runtime',action='store_true')
    args=p.parse_args()
    try:
        print(json.dumps(verify(args.root,args.runtime_root,args.require_runtime),ensure_ascii=False))
    except (AssertionError,KeyError,OSError,ValueError) as error:
        print('FAIL: '+str(error),file=sys.stderr)
        sys.exit(1)
