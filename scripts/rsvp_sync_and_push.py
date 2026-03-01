#!/usr/bin/env python3
import json, os, subprocess, sys, urllib.request
from pathlib import Path
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[1]
STATE=ROOT/'.automation'/'rsvp_sync_state.json'
SOURCE=ROOT/'data'/'guest-index-source.json'
HASHED=ROOT/'public'/'guest-index-hash.json'
MAX_RUNS=60


def run(cmd):
    return subprocess.run(cmd,cwd=ROOT,text=True,capture_output=True)


def load_state():
    if STATE.exists():
        try:return json.loads(STATE.read_text())
        except: pass
    return {'runs':0}


def save_state(s):
    STATE.parent.mkdir(parents=True,exist_ok=True)
    STATE.write_text(json.dumps(s,indent=2))


def fetch_json(url, timeout=25):
    req=urllib.request.Request(url, headers={'User-Agent':'rsvp-sync-bot/1.0'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode('utf-8'))


def normalize_payload(p):
    # accepts either {lookup,parties} or {guests:[{partyId,partyName,firstName,lastName,type}]}
    if isinstance(p,dict) and 'lookup' in p and 'parties' in p:
        return p
    guests = p.get('guests') if isinstance(p,dict) else None
    if not isinstance(guests,list):
        raise ValueError('Unsupported payload shape; expected {lookup,parties} or {guests:[...]}')
    parties={}
    lookup=[]
    for g in guests:
        pid=str(g.get('partyId','')).strip()
        if not pid: continue
        pname=str(g.get('partyName') or pid).strip()
        fn=str(g.get('firstName','')).strip()
        ln=str(g.get('lastName','')).strip()
        gt=str(g.get('type') or 'adult').strip().lower()
        pz=parties.setdefault(pid,{'partyId':pid,'partyName':pname,'guests':[]})
        pz['guests'].append({'name':(fn+' '+ln).strip(),'type':gt,'firstName':fn,'lastName':ln})
        if fn and ln:
            lookup.append({'first':fn.lower(),'last':ln.lower(),'partyId':pid,'partyName':pname})
    return {'version':1,'lookup':lookup,'parties':list(parties.values())}


def main():
    st=load_state()
    if st.get('runs',0) >= MAX_RUNS:
        print(f'[rsvp-sync] max runs reached ({MAX_RUNS}); exiting')
        return 0

    url=os.environ.get('RSVP_INDEX_SOURCE_URL','').strip()
    if not url:
        env_file=ROOT/'.automation'/'rsvp_sync.env'
        if env_file.exists():
            for line in env_file.read_text(encoding='utf-8').splitlines():
                if line.strip().startswith('RSVP_INDEX_SOURCE_URL='):
                    url=line.split('=',1)[1].strip()
                    break
    if not url:
        print('[rsvp-sync] RSVP_INDEX_SOURCE_URL not set; exiting non-fatally')
        st['runs']=st.get('runs',0)+1
        st['lastRunUtc']=datetime.now(timezone.utc).isoformat()
        st['lastStatus']='missing-source-url'
        save_state(st)
        return 0

    try:
        payload=fetch_json(url)
        source_obj=normalize_payload(payload)
    except Exception as e:
        print('[rsvp-sync] fetch/normalize failed:',e)
        st['runs']=st.get('runs',0)+1
        st['lastRunUtc']=datetime.now(timezone.utc).isoformat()
        st['lastStatus']='fetch-failed'
        st['lastError']=str(e)
        save_state(st)
        return 1

    SOURCE.parent.mkdir(parents=True,exist_ok=True)
    new_txt=json.dumps(source_obj,ensure_ascii=False,indent=2)
    old_txt=SOURCE.read_text(encoding='utf-8') if SOURCE.exists() else None
    changed=(new_txt!=old_txt)
    if changed:
        SOURCE.write_text(new_txt,encoding='utf-8')
        r=run(['python3','scripts/build_hashed_guest_index.py','data/guest-index-source.json','public/guest-index-hash.json'])
        if r.returncode!=0:
            print(r.stdout,r.stderr)
            return r.returncode
        run(['git','add','data/guest-index-source.json','public/guest-index-hash.json','.automation/rsvp_sync_state.json'])
        c=run(['git','commit','-m','chore: sync hashed RSVP guest index from source'])
        if c.returncode==0:
            p=run(['git','push','origin','main'])
            print(p.stdout,p.stderr)
        else:
            print('[rsvp-sync] no commit needed or commit failed:',c.stdout,c.stderr)
    else:
        print('[rsvp-sync] no guest list changes')

    st['runs']=st.get('runs',0)+1
    st['lastRunUtc']=datetime.now(timezone.utc).isoformat()
    st['lastStatus']='changed' if changed else 'unchanged'
    save_state(st)
    return 0

if __name__=='__main__':
    sys.exit(main())
