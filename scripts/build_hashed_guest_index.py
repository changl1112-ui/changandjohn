#!/usr/bin/env python3
import json, sys
from pathlib import Path

def norm(s):
    return ' '.join(str(s or '').strip().lower().split())

def fnv1a_32(text:str)->str:
    h=0x811c9dc5
    for b in text.encode('utf-8'):
        h ^= b
        h = (h * 0x01000193) & 0xffffffff
    return format(h,'08x')

src=Path(sys.argv[1] if len(sys.argv)>1 else 'public/guest-index.json')
out=Path(sys.argv[2] if len(sys.argv)>2 else 'public/guest-index-hash.json')
obj=json.loads(src.read_text(encoding='utf-8'))
entries=[]
for row in obj.get('lookup',[]):
    first=norm(row.get('first',''))
    last=norm(row.get('last',''))
    if not first or not last: continue
    key=f'{first}|{last}'
    entries.append({'h':fnv1a_32(key),'partyId':str(row.get('partyId',''))})

# de-dupe by hash
seen={}
for e in entries:
    seen[e['h']]=e
entries=list(seen.values())

hashed={
  'version': 1,
  'generatedFrom': src.name,
  'entries': entries,
  'parties': obj.get('parties',[])
}
out.write_text(json.dumps(hashed,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'wrote {out} entries={len(entries)} parties={len(hashed["parties"])}')
