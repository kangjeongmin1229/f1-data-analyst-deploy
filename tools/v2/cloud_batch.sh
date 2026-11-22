#!/bin/bash
# cloud copies (720p mp4, audio muxed) of the 27 formula1.com tuning pole videos -> yt/out2/<row>_cl.json; media deleted after each
cd /home/claude/ser/yt
python3 - <<'P' > /tmp/vid/rows.txt
import json; d=json.load(open('/home/claude/ser/f1/upcount_source_pc.json'))['laps']; I={r['row']:r for r in json.load(open('/home/claude/ser/yt/index_rows.json'))}
for k,v in d.items():
    if 'row' in v: print(v['row'], json.load(open(f"/home/claude/ser/yt/out2/{v['row']}.json"))['meta']['src'])
P
while read row src; do
  [ -f out2/${row}_cl.json ] && continue
  python3 -m yt_dlp -q -f "http-2324k-720p-1/http-2324k-720p-0/b[height<=720]" -o "/tmp/vid/$row.mp4" "$src" 2>/dev/null
  [ -f /tmp/vid/$row.mp4 ] && python3 yt_extract.py /tmp/vid/$row.mp4 /tmp/vid/$row.mp4 out2/${row}_cl.json "$(python3 -c "import json;m=json.load(open('out2/$row.json'))['meta'];m['row']='${row}_cl';m['audio_src']='cloud mp4 720p';print(json.dumps(m))")" | tail -1
  rm -f /tmp/vid/$row.mp4
done < /tmp/vid/rows.txt
echo BATCH_DONE
