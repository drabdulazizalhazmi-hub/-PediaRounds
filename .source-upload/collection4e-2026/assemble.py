"""Reassemble the user-supplied PDF and refuse any byte mismatch."""
from pathlib import Path
import hashlib, json

root = Path.cwd()
inventory = json.loads((root/'.source-upload/collection4e-2026/manifest.json').read_text())
assert inventory['sha256'] == '85f22dabc1e7f434bc39c49efecb2dcb7f4caadc63ac2abb93f6124a96b370b3'
assert len(inventory['chunks']) == 13
target = root/'master-bank/sources/original-pdfs/Pediatric-Saudi-Board-Exams-Question-Collection-4th-ED-1-May-2026.pdf'
target.parent.mkdir(parents=True, exist_ok=True)
whole = hashlib.sha256()
size = 0
with target.open('wb') as out:
    for index, chunk in enumerate(inventory['chunks']):
        assert chunk['path'] == f'.source-upload/collection4e-2026/part-{index:02}.bin'
        data = (root/chunk['path']).read_bytes()
        assert len(data) == chunk['sizeBytes']
        assert hashlib.sha256(data).hexdigest() == chunk['sha256']
        out.write(data)
        whole.update(data)
        size += len(data)
assert size == inventory['sizeBytes'] == 37848909
assert whole.hexdigest() == inventory['sha256']
metadata = {key: value for key, value in inventory.items() if key != 'chunks'}
metadata['path'] = target.relative_to(root).as_posix()
target.with_suffix('.manifest.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2)+'\n')
print(f'Verified original PDF: {size} bytes, SHA-256 {whole.hexdigest()}')
