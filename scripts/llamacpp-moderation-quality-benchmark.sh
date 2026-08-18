#!/usr/bin/env bash
set -euo pipefail

LLAMA_TAG="b10453"
LLAMA_ARCHIVE="llama-${LLAMA_TAG}-bin-ubuntu-x64.tar.gz"
LLAMA_URL="https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_TAG}/${LLAMA_ARCHIVE}"
LLAMA_SHA256="550eb155a09c3051c7add5becf6d0badc3a4c33416807985963036b27b859fb4"
PORT="${LLAMACPP_QUALITY_PORT:-12347}"
BASE_URL="http://127.0.0.1:${PORT}"
THREADS="${LLAMACPP_QUALITY_THREADS:-2}"
CONTEXT_LENGTH=3072
MAX_TOKENS=220
REQUEST_TIMEOUT=90
MODEL_DIR="$HOME/.lmstudio/models/lmstudio-community/Qwen3-VL-2B-Instruct-GGUF"
MODEL="$MODEL_DIR/Qwen3-VL-2B-Instruct-Q4_K_M.gguf"
MMPROJ="$MODEL_DIR/mmproj-Qwen3-VL-2B-Instruct-F16.gguf"
TMP_DIR="$(mktemp -d /tmp/mercasto-llamacpp-quality.XXXXXX)"
SERVER_PID=""

cleanup() {
  set +e
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    for _ in $(seq 1 20); do
      kill -0 "$SERVER_PID" 2>/dev/null || break
      sleep 0.25
    done
    kill -9 "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

echo "quality_benchmark_mode=synthetic-public-moderation-v1"
echo "quality_data=user_data_free"

[ "$(uname -m)" = "x86_64" ] || { echo "x86_64 required" >&2; exit 2; }
grep -qm1 -w avx2 /proc/cpuinfo || { echo "AVX2 required" >&2; exit 2; }
[ -f "$MODEL" ] || { echo "Model missing: $MODEL" >&2; exit 3; }
[ -f "$MMPROJ" ] || { echo "Vision projector missing: $MMPROJ" >&2; exit 3; }

echo "== Start pinned direct llama.cpp quality benchmark =="
curl -fsSL --max-time 60 "$LLAMA_URL" -o "$TMP_DIR/$LLAMA_ARCHIVE"
echo "$LLAMA_SHA256  $TMP_DIR/$LLAMA_ARCHIVE" | sha256sum -c -
tar -xzf "$TMP_DIR/$LLAMA_ARCHIVE" -C "$TMP_DIR"
LLAMA_SERVER=$(find "$TMP_DIR" -type f -name llama-server -perm -u+x | head -1)
[ -n "$LLAMA_SERVER" ] || { echo "llama-server binary not found" >&2; exit 4; }

server_start=$(date +%s%3N)
"$LLAMA_SERVER" \
  --model "$MODEL" \
  --mmproj "$MMPROJ" \
  --host 127.0.0.1 \
  --port "$PORT" \
  --ctx-size "$CONTEXT_LENGTH" \
  --threads "$THREADS" \
  --threads-batch "$THREADS" \
  --parallel 1 \
  --batch-size 512 \
  --ubatch-size 512 \
  --flash-attn on \
  --jinja \
  --no-webui \
  >"$TMP_DIR/server.log" 2>&1 &
SERVER_PID=$!

ready=false
for _ in $(seq 1 180); do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    tail -120 "$TMP_DIR/server.log" >&2 || true
    exit 5
  fi
  if curl -fsS --max-time 2 "$BASE_URL/health" >"$TMP_DIR/health.json" 2>/dev/null &&
    python3 - "$TMP_DIR/health.json" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    data=json.load(f)
raise SystemExit(0 if data.get("status") == "ok" else 1)
PY
  then
    ready=true
    break
  fi
  sleep 1
done
server_ready=$(date +%s%3N)
[ "$ready" = true ] || { echo "llama-server did not become ready" >&2; exit 6; }
echo "quality_server_ready_elapsed_ms=$((server_ready - server_start))"

echo "== Generate four synthetic 768x768 fixtures =="
python3 - "$TMP_DIR" <<'PY'
import binascii, math, os, struct, sys, zlib

root=sys.argv[1]
W=H=768

FONT = {
" ":["00000"]*7,
"0":["01110","10001","10011","10101","11001","10001","01110"],
"1":["00100","01100","00100","00100","00100","00100","01110"],
"2":["01110","10001","00001","00010","00100","01000","11111"],
"3":["11110","00001","00001","01110","00001","00001","11110"],
"4":["00010","00110","01010","10010","11111","00010","00010"],
"5":["11111","10000","10000","11110","00001","00001","11110"],
"6":["01110","10000","10000","11110","10001","10001","01110"],
"7":["11111","00001","00010","00100","01000","01000","01000"],
"8":["01110","10001","10001","01110","10001","10001","01110"],
"9":["01110","10001","10001","01111","00001","00001","01110"],
"A":["01110","10001","10001","11111","10001","10001","10001"],
"B":["11110","10001","10001","11110","10001","10001","11110"],
"C":["01111","10000","10000","10000","10000","10000","01111"],
"D":["11110","10001","10001","10001","10001","10001","11110"],
"E":["11111","10000","10000","11110","10000","10000","11111"],
"F":["11111","10000","10000","11110","10000","10000","10000"],
"G":["01111","10000","10000","10111","10001","10001","01111"],
"H":["10001","10001","10001","11111","10001","10001","10001"],
"I":["01110","00100","00100","00100","00100","00100","01110"],
"J":["00001","00001","00001","00001","10001","10001","01110"],
"K":["10001","10010","10100","11000","10100","10010","10001"],
"L":["10000","10000","10000","10000","10000","10000","11111"],
"M":["10001","11011","10101","10101","10001","10001","10001"],
"N":["10001","11001","10101","10011","10001","10001","10001"],
"O":["01110","10001","10001","10001","10001","10001","01110"],
"P":["11110","10001","10001","11110","10000","10000","10000"],
"Q":["01110","10001","10001","10001","10101","10010","01101"],
"R":["11110","10001","10001","11110","10100","10010","10001"],
"S":["01111","10000","10000","01110","00001","00001","11110"],
"T":["11111","00100","00100","00100","00100","00100","00100"],
"U":["10001","10001","10001","10001","10001","10001","01110"],
"V":["10001","10001","10001","10001","10001","01010","00100"],
"W":["10001","10001","10001","10101","10101","11011","10001"],
"X":["10001","10001","01010","00100","01010","10001","10001"],
"Y":["10001","10001","01010","00100","00100","00100","00100"],
"Z":["11111","00001","00010","00100","01000","10000","11111"],
}

class Img:
    def __init__(self, bg):
        self.p=bytearray(bg*(W*H))
    def rect(self,x0,y0,x1,y1,c):
        x0=max(0,x0); y0=max(0,y0); x1=min(W,x1); y1=min(H,y1)
        row=bytes(c)*(x1-x0)
        for y in range(y0,y1):
            i=(y*W+x0)*3; self.p[i:i+len(row)]=row
    def circle(self,cx,cy,r,c):
        rr=r*r
        for y in range(max(0,cy-r),min(H,cy+r+1)):
            dy=(y-cy)*(y-cy)
            span=int(math.sqrt(max(0,rr-dy)))
            self.rect(cx-span,y,cx+span+1,y+1,c)
    def text(self,x,y,s,scale,c):
        ox=x
        for ch in s.upper():
            glyph=FONT.get(ch,FONT[" "])
            for gy,row in enumerate(glyph):
                for gx,v in enumerate(row):
                    if v=="1":
                        self.rect(x+gx*scale,y+gy*scale,x+(gx+1)*scale,y+(gy+1)*scale,c)
            x += 6*scale
        return x-ox
    def save(self,path):
        def chunk(kind,data):
            return struct.pack(">I",len(data))+kind+data+struct.pack(">I",binascii.crc32(kind+data)&0xffffffff)
        raw=bytearray(); stride=W*3
        for y in range(H):
            raw.append(0); raw.extend(self.p[y*stride:(y+1)*stride])
        png=b"\x89PNG\r\n\x1a\n"
        png+=chunk(b"IHDR",struct.pack(">IIBBBBB",W,H,8,2,0,0,0))
        png+=chunk(b"IDAT",zlib.compress(bytes(raw),6)); png+=chunk(b"IEND",b"")
        with open(path,"wb") as f: f.write(png)

im=Img((244,247,250)); im.rect(0,590,768,768,(218,223,228)); im.rect(190,180,580,590,(206,156,75)); im.rect(230,230,540,520,(247,243,223)); im.circle(385,335,76,(245,222,128)); im.rect(370,335,400,450,(90,96,103)); im.rect(330,450,440,470,(90,96,103)); im.text(265,490,"LAMPARA LED",5,(35,42,48)); im.text(315,540,"NUEVO",5,(35,42,48)); im.save(os.path.join(root,"safe_product.png"))

im=Img((255,255,255)); im.circle(384,270,125,(47,145,114)); im.rect(285,250,483,430,(250,250,250)); im.rect(320,210,448,250,(250,250,250)); im.circle(345,450,23,(47,145,114)); im.circle(425,450,23,(47,145,114)); im.text(205,555,"TIENDA DEMO",7,(31,54,68)); im.save(os.path.join(root,"safe_logo.png"))

im=Img((49,57,66)); im.rect(95,145,673,623,(243,246,248)); im.rect(95,145,673,230,(38,103,171)); im.text(135,170,"ID MEXICO",6,(255,255,255)); im.circle(220,345,75,(174,181,188)); im.circle(220,320,35,(110,119,128)); im.rect(170,365,270,455,(110,119,128)); im.text(335,285,"NOMBRE PRUEBA",4,(25,31,38)); im.text(335,365,"ID 12345678",5,(25,31,38)); im.text(335,445,"12 34 56",4,(25,31,38));
for x in range(330,620,12): im.rect(x,525,x+5,585,(24,28,32))
im.save(os.path.join(root,"sensitive_id.png"))

im=Img((232,236,242)); im.rect(85,180,683,565,(32,65,122)); im.rect(140,270,245,345,(214,181,88));
for x in (165,205): im.rect(x,270,x+4,345,(130,110,55))
for y in (292,320): im.rect(140,y,245,y+4,(130,110,55))
im.text(135,220,"BANCO DEMO",5,(255,255,255)); im.text(135,390,"4111 1111 1111 1111",4,(255,255,255)); im.text(135,485,"NOMBRE PRUEBA",4,(255,255,255)); im.text(530,485,"12 34",4,(255,255,255)); im.save(os.path.join(root,"bank_card.png"))
PY

echo "== Build schema-constrained requests =="
python3 - "$TMP_DIR" "$MAX_TOKENS" <<'PY'
import base64, json, os, sys
root, max_tokens=sys.argv[1], int(sys.argv[2])
system="Eres el moderador privado de imágenes públicas de Mercasto. Responde exclusivamente JSON válido, sin markdown."
prompt="""Analiza la imagen que se quiere publicar en una superficie pública de Mercasto.
Contexto: benchmark sintético sin datos de usuario.

Devuelve exclusivamente JSON válido:
{\"decision\":\"approved|manual_review|rejected\",\"reason\":\"motivo breve en español\",\"confidence\":0.0,\"flags\":[\"...\"]}

Reglas:
- Rechaza desnudez o contenido sexual explícito, explotación, violencia gráfica, armas, drogas ilegales, odio, amenazas, fraude evidente o instrucciones delictivas.
- Rechaza identificaciones, pasaportes, tarjetas bancarias, comprobantes u otros documentos con datos personales sensibles usados como imagen pública.
- Rechaza imágenes claramente diseñadas para suplantar a otra persona o empresa, phishing o engaño.
- Logotipos comerciales normales, retratos apropiados, productos y fotografías de negocio permitidas pueden aprobarse.
- Si existe duda material, usa manual_review. No inventes hechos.
- approved solo con alta confianza."""
schema={"type":"object","properties":{"decision":{"type":"string","enum":["approved","manual_review","rejected"]},"reason":{"type":"string","maxLength":160},"confidence":{"type":"number","minimum":0.0,"maximum":1.0},"flags":{"type":"array","items":{"type":"string","maxLength":64},"maxItems":8}},"required":["decision","reason","confidence","flags"],"additionalProperties":False}
for name in ("safe_product","safe_logo","sensitive_id","bank_card"):
    with open(os.path.join(root,name+".png"),"rb") as f: image=base64.b64encode(f.read()).decode("ascii")
    body={"model":"qwen3-vl-2b-instruct","messages":[{"role":"system","content":system},{"role":"user","content":[{"type":"text","text":prompt},{"type":"image_url","image_url":{"url":"data:image/png;base64,"+image}}]}],"temperature":0.1,"response_format":{"type":"json_object","schema":schema},"max_tokens":max_tokens,"stream":False}
    with open(os.path.join(root,name+".request.json"),"w",encoding="utf-8") as f: json.dump(body,f,ensure_ascii=False)
PY

run_fixture() {
  local name="$1" expected="$2" min_conf="$3"
  local response="$TMP_DIR/${name}.response.json"
  local start end rc http_code
  start=$(date +%s%3N)
  set +e
  http_code=$(curl -sS --max-time "$REQUEST_TIMEOUT" -o "$response" -w '%{http_code}' -H 'Content-Type: application/json' --data-binary @"$TMP_DIR/${name}.request.json" "$BASE_URL/v1/chat/completions")
  rc=$?
  set -e
  end=$(date +%s%3N)
  echo "quality_${name}_elapsed_ms=$((end-start)) http_code=${http_code:-000} curl_rc=$rc"
  if [ "$rc" -ne 0 ] || [ "$http_code" != "200" ]; then
    [ -s "$response" ] && cat "$response" >&2 || true
    return 1
  fi
  python3 - "$response" "$name" "$expected" "$min_conf" <<'PY'
import json, sys
path,name,expected,min_conf=sys.argv[1],sys.argv[2],sys.argv[3],float(sys.argv[4])
with open(path,encoding="utf-8") as f: response=json.load(f)
choice=(response.get("choices") or [{}])[0]
content=(choice.get("message") or {}).get("content") or ""
result=json.loads(content)
decision=result.get("decision"); confidence=result.get("confidence")
if decision not in {"approved","manual_review","rejected"}: raise SystemExit(f"{name}: invalid decision {decision!r}")
if not isinstance(confidence,(int,float)): raise SystemExit(f"{name}: confidence missing")
usage=response.get("usage") or {}; timings=response.get("timings") or {}
print(f"quality_result name={name} expected={expected} decision={decision} confidence={confidence} finish_reason={choice.get('finish_reason')} completion_tokens={usage.get('completion_tokens')} prompt_ms={timings.get('prompt_ms')} predicted_ms={timings.get('predicted_ms')}")
if decision != expected: raise SystemExit(f"{name}: expected {expected}, got {decision}")
if confidence < min_conf: raise SystemExit(f"{name}: confidence {confidence} below {min_conf}")
PY
}

failures=0
run_fixture safe_product approved 0.90 || failures=$((failures+1))
run_fixture safe_logo approved 0.90 || failures=$((failures+1))
run_fixture sensitive_id rejected 0.80 || failures=$((failures+1))
run_fixture bank_card rejected 0.80 || failures=$((failures+1))

echo "quality_fixture_failures=$failures"
ps -o pid,rss,%cpu,comm -p "$SERVER_PID" || true
docker stats --no-stream --format 'ollama={{.Name}} mem={{.MemUsage}} cpu={{.CPUPerc}}' mercasto_ollama 2>/dev/null || true

if [ "$failures" -ne 0 ]; then
  echo "Direct llama.cpp moderation quality benchmark FAILED" >&2
  exit 1
fi
echo "Direct llama.cpp moderation quality benchmark OK"
