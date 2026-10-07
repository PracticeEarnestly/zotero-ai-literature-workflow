"""Dependency-free, reproducible Zotero XPI builder (Python 3)."""
import hashlib
import json
import pathlib
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
MODULES = [
    'prompts/figureTableDeepReview.js', 'rating/styleRatingReader.js',
    'storage/workflowState.js', 'automation/triggerEngine.js',
    'adapters/llmForZoteroAdapter.js', 'vendor/marked.umd.js', 'notes/markdownRenderer.js', 'notes/reviewNoteWriter.js', 'notes/migrateNotes.js',
    'automation/taskQueue.js', 'preferences/settings.js',
    'rating/ratingWatcher.js', 'hooks.js',
]

def bundle():
    return '\n'.join('// src/' + name + '\n' + (ROOT / 'src' / name).read_text() for name in MODULES)

if __name__ == '__main__':
    manifest = json.loads((ROOT / 'addon/manifest.json').read_text())
    app = manifest.get('applications', {}).get('zotero', {})
    required = ('id', 'update_url', 'strict_min_version', 'strict_max_version')
    if any(not app.get(key) for key in required):
        raise ValueError('Missing Zotero manifest fields: ' + ', '.join(key for key in required if not app.get(key)))
    if manifest['version'] != json.loads((ROOT / 'package.json').read_text())['version']:
        raise ValueError('Package and manifest versions differ')
    dist = ROOT / 'dist'
    dist.mkdir(exist_ok=True)
    output = dist / f'zotero-llm-automation-bridge-{manifest["version"]}.xpi'
    entries = {str(p.relative_to(ROOT / 'addon')).replace('\\', '/'): p.read_bytes()
               for p in (ROOT / 'addon').rglob('*') if p.is_file()}
    entries['content/bridge.js'] = bundle().encode()
    entries['licenses/marked-LICENSE.md'] = (ROOT / 'src/vendor/marked-LICENSE.md').read_bytes()
    entries['licenses/marked-provenance.json'] = (ROOT / 'src/vendor/marked-provenance.json').read_bytes()
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name, data in sorted(entries.items()):
            info = zipfile.ZipInfo(name, (2026, 10, 7, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, data)
    with zipfile.ZipFile(output) as archive:
        assert archive.testzip() is None
        assert {'manifest.json', 'bootstrap.js', 'content/bridge.js'} <= set(archive.namelist())
    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    output.with_suffix('.xpi.sha256').write_text(f'{digest}  {output.name}\n')
    print(f'{output}\n{output.stat().st_size} bytes\nSHA-256: {digest}')
