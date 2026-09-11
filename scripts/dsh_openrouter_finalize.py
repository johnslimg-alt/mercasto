#!/usr/bin/env python3
from __future__ import annotations

import datetime as dt
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

DSH_HOME = Path("/root/.dsh")
SETTINGS = DSH_HOME / "settings.yaml"
BACKUP_DIR = DSH_HOME / "backups" / "model-rotation"
DSH_VERSION = "0.1.5-rc.1"
STAMP = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
BACKUP = BACKUP_DIR / f"settings.yaml.pre-finalize.{STAMP}"


def run(cmd: list[str], *, timeout: int | None = None, capture: bool = False) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        cmd,
        check=True,
        text=True,
        timeout=timeout,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.STDOUT if capture else None,
    )


def atomic_write(path: Path, text: str, mode: int | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix=f".{path.name}.", text=True)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(tmp, mode if mode is not None else (path.stat().st_mode & 0o777 if path.exists() else 0o600))
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def set_default(provider: str, model: str, reasoning: str = "") -> None:
    text = SETTINGS.read_text(encoding="utf-8")
    block = f"agent-default-model:\n  provider: {provider}\n  model: {model}\n"
    if reasoning:
        block += f"  reasoningEffort: {reasoning}\n"
    pattern = re.compile(r"(?m)^agent-default-model:\s*(?:#.*)?\n(?:^[ \t]+.*\n)*")
    match = pattern.search(text)
    new_text = text[:match.start()] + block + text[match.end():] if match else text.rstrip() + "\n\n" + block
    atomic_write(SETTINGS, new_text)


def smoke(provider: str, model: str, marker: str, reasoning: str = "") -> None:
    set_default(provider, model, reasoning)
    run(["npx", "--yes", f"@deepseek-ai/dsh@{DSH_VERSION}", "--profile", "web", "--dump-config"], timeout=90, capture=True)
    try:
        proc = run(
            ["npx", "--yes", f"@deepseek-ai/dsh@{DSH_VERSION}", "--profile", "headless", f"Reply with exactly: {marker}"],
            timeout=150,
            capture=True,
        )
    except subprocess.CalledProcessError as exc:
        diagnostic = exc.stdout or ""
        diagnostic = re.sub(r"sk-[A-Za-z0-9_-]+", "<redacted>", diagnostic)
        print("DSH_SMOKE_DIAGNOSTIC_BEGIN")
        print("\n".join(diagnostic.splitlines()[-80:]))
        print("DSH_SMOKE_DIAGNOSTIC_END")
        raise
    if marker not in (proc.stdout or ""):
        diagnostic = re.sub(r"sk-[A-Za-z0-9_-]+", "<redacted>", proc.stdout or "")
        print("DSH_SMOKE_DIAGNOSTIC_BEGIN")
        print("\n".join(diagnostic.splitlines()[-80:]))
        print("DSH_SMOKE_DIAGNOSTIC_END")
        raise RuntimeError(f"{provider}/{model} smoke returned unexpected output")
    print(f"{marker}=yes")


def write_rotation_runtime() -> None:
    env_text = """DSH_HOME=/root/.dsh
DEEPSEEK_PROVIDER=deepseek-official
DEEPSEEK_MODEL=deepseek-flash
GLM_PROVIDER=openrouter
GLM_MODEL=z-ai/glm-5.3-flash:free
"""
    atomic_write(Path("/etc/dsh-model-rotation.env"), env_text, 0o600)

    rotation = r'''#!/usr/bin/env python3
import datetime as dt
import fcntl
import os
import re
import shutil
import sys
import tempfile
from pathlib import Path
from zoneinfo import ZoneInfo

home = Path(os.environ.get("DSH_HOME", "/root/.dsh"))
settings = home / "settings.yaml"
backup_dir = home / "backups" / "model-rotation"
lock_file = Path("/run/lock/dsh-model-rotate.lock")
config = {
    "deepseek": {
        "provider": os.environ.get("DEEPSEEK_PROVIDER", "deepseek-official"),
        "model": os.environ.get("DEEPSEEK_MODEL", "deepseek-flash"),
        "reasoning": "max",
    },
    "glm": {
        "provider": os.environ.get("GLM_PROVIDER", "openrouter"),
        "model": os.environ.get("GLM_MODEL", "z-ai/glm-5.3-flash:free"),
        "reasoning": "",
    },
}

def desired_now():
    now = dt.datetime.now(ZoneInfo("America/Mexico_City"))
    minute = now.hour * 60 + now.minute
    return "glm" if (0 <= minute < 240 or 960 <= minute < 1320) else "deepseek"

def current(text):
    match = re.search(r"(?m)^agent-default-model:\s*(?:#.*)?\n(?:^[ \t]+.*\n)*", text)
    result = {}
    if not match:
        return result
    for line in match.group(0).splitlines()[1:]:
        item = re.match(r"\s+(provider|model):\s*([^\s#]+)", line)
        if item:
            result[item.group(1)] = item.group(2)
    return result

def render(kind):
    cfg = config[kind]
    block = f"agent-default-model:\n  provider: {cfg['provider']}\n  model: {cfg['model']}\n"
    if cfg["reasoning"]:
        block += f"  reasoningEffort: {cfg['reasoning']}\n"
    return block

def replace(text, kind):
    match = re.search(r"(?m)^agent-default-model:\s*(?:#.*)?\n(?:^[ \t]+.*\n)*", text)
    block = render(kind)
    if not match:
        return text.rstrip() + "\n\n" + block
    return text[:match.start()] + block + text[match.end():]

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "reconcile"
    kind = desired_now() if mode in ("reconcile", "status") else mode
    if kind not in config:
        raise SystemExit("usage: dsh-model-rotate [reconcile|status|deepseek|glm]")
    lock_file.parent.mkdir(parents=True, exist_ok=True)
    with lock_file.open("w") as lock:
        fcntl.flock(lock.fileno(), fcntl.LOCK_EX)
        text = settings.read_text(encoding="utf-8")
        cur = current(text)
        cfg = config[kind]
        match = cur.get("provider") == cfg["provider"] and cur.get("model") == cfg["model"]
        if mode == "status":
            print(
                f"desired={kind} desired_provider={cfg['provider']} desired_model={cfg['model']} "
                f"current_provider={cur.get('provider','<unset>')} current_model={cur.get('model','<unset>')} "
                f"match={'yes' if match else 'no'}"
            )
            return
        if match:
            print(f"rotation desired={kind} changed=no")
            return
        backup_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
        stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        backup = backup_dir / f"settings.yaml.auto.{stamp}"
        shutil.copy2(settings, backup)
        os.chmod(backup, 0o600)
        fd, tmp = tempfile.mkstemp(dir=str(settings.parent), prefix=".settings.rotation.", text=True)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                handle.write(replace(text, kind))
                handle.flush()
                os.fsync(handle.fileno())
            os.chmod(tmp, settings.stat().st_mode & 0o777)
            os.replace(tmp, settings)
        finally:
            if os.path.exists(tmp):
                os.unlink(tmp)
        print(f"rotation desired={kind} changed=yes")

if __name__ == "__main__":
    main()
'''
    atomic_write(Path("/usr/local/sbin/dsh-model-rotate"), rotation, 0o755)
    run(["python3", "-m", "py_compile", "/usr/local/sbin/dsh-model-rotate"])

    service = """[Unit]
Description=Reconcile DeepSeek Harness default model
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=root
Group=root
UMask=0077
EnvironmentFile=/etc/dsh-model-rotation.env
ExecStartPre=/usr/bin/test -r /root/.dsh/settings.yaml
ExecStart=/usr/local/sbin/dsh-model-rotate reconcile
"""
    timer = """[Unit]
Description=Daily Mexico City DeepSeek/GLM model rotation

[Timer]
OnCalendar=*-*-* 00:00:00 America/Mexico_City
OnCalendar=*-*-* 04:00:00 America/Mexico_City
OnCalendar=*-*-* 16:00:00 America/Mexico_City
OnCalendar=*-*-* 22:00:00 America/Mexico_City
Persistent=true
AccuracySec=1s
Unit=dsh-model-rotate.service

[Install]
WantedBy=timers.target
"""
    atomic_write(Path("/etc/systemd/system/dsh-model-rotate.service"), service, 0o644)
    atomic_write(Path("/etc/systemd/system/dsh-model-rotate.timer"), timer, 0o644)
    for hour in ("00:00:00", "04:00:00", "16:00:00", "22:00:00"):
        run(["systemd-analyze", "calendar", f"*-*-* {hour} America/Mexico_City"], capture=True)


def retire_old_pause() -> None:
    subprocess.run(["systemctl", "disable", "--now", "dsh-pause.timer", "dsh-resume.timer"], check=False)
    gate = Path("/usr/local/sbin/dsh-deepseek-credential-gate")
    if gate.exists():
        subprocess.run([str(gate), "resume"], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    guard = Path("/etc/systemd/system/deepseek-harness.service.d/20-ai-window-guard.conf")
    if guard.exists():
        shutil.copy2(guard, BACKUP_DIR / f"20-ai-window-guard.conf.{STAMP}")
        guard.unlink()


def cleanup_transfer_artifacts() -> None:
    for path in (
        DSH_HOME / ".openrouter-key.enc",
        DSH_HOME / ".openrouter-install-private.pem",
        DSH_HOME / ".openrouter-install-public.pem",
        Path("/run/openrouter-api-key"),
    ):
        try:
            path.unlink()
        except FileNotFoundError:
            pass


def main() -> int:
    if os.geteuid() != 0:
        raise RuntimeError("must run as root")
    if not SETTINGS.is_file():
        raise RuntimeError("DSH settings missing")
    BACKUP_DIR.mkdir(mode=0o700, parents=True, exist_ok=True)
    shutil.copy2(SETTINGS, BACKUP)
    os.chmod(BACKUP, 0o600)
    committed = False
    try:
        print("=== CONFIG PRECHECK ===")
        run(["npx", "--yes", f"@deepseek-ai/dsh@{DSH_VERSION}", "--profile", "web", "--dump-config"], timeout=90, capture=True)

        print("=== GLM FREE SMOKE ===")
        smoke("openrouter", "z-ai/glm-5.3-flash:free", "ROTATION_GLM_FREE_OK")

        print("=== DEEPSEEK SMOKE ===")
        smoke("deepseek-official", "deepseek-flash", "ROTATION_DEEPSEEK_OK", "max")

        print("=== INSTALL ROTATION ===")
        write_rotation_runtime()
        retire_old_pause()
        run(["systemctl", "daemon-reload"])
        run(["systemctl", "enable", "--now", "dsh-model-rotate.timer"])

        env = os.environ.copy()
        for line in Path("/etc/dsh-model-rotation.env").read_text().splitlines():
            if line and "=" in line:
                key, value = line.split("=", 1)
                env[key] = value
        subprocess.run(["/usr/local/sbin/dsh-model-rotate", "reconcile"], check=True, env=env)

        print("=== HARNESS RESTART ===")
        run(["systemctl", "restart", "deepseek-harness.service"])
        run(["systemctl", "restart", "deepseek-harness-proxy.service"])
        for _ in range(30):
            harness = subprocess.run(["systemctl", "is-active", "--quiet", "deepseek-harness.service"]).returncode == 0
            proxy = subprocess.run(["systemctl", "is-active", "--quiet", "deepseek-harness-proxy.service"]).returncode == 0
            port = subprocess.run(["bash", "-lc", "ss -lnt | grep -q '127.0.0.1:3080'"]).returncode == 0
            if harness and proxy and port:
                break
            time.sleep(2)
        run(["systemctl", "is-active", "deepseek-harness.service"])
        run(["systemctl", "is-active", "deepseek-harness-proxy.service"])

        print("=== FINAL STATUS ===")
        run(["systemctl", "is-enabled", "dsh-model-rotate.timer"])
        run(["systemctl", "is-active", "dsh-model-rotate.timer"])
        run(["/usr/local/sbin/dsh-model-rotate", "status"], capture=False)
        print("pause_timer=" + subprocess.run(["systemctl", "is-enabled", "dsh-pause.timer"], text=True, capture_output=True).stdout.strip())
        print("resume_timer=" + subprocess.run(["systemctl", "is-enabled", "dsh-resume.timer"], text=True, capture_output=True).stdout.strip())
        http = subprocess.run(["curl", "-sSI", "--max-time", "20", "https://harness.flyaicrm.com/"], text=True, capture_output=True)
        print("\n".join(http.stdout.splitlines()[:12]))
        subprocess.run(["pgrep", "-af", r"graphify\.serve"], check=False)

        cleanup_transfer_artifacts()
        committed = True
        print("DSH_OPENROUTER_FINALIZE_OK")
        return 0
    finally:
        if not committed:
            shutil.copy2(BACKUP, SETTINGS)
            print("DSH_FINALIZE_ROLLBACK")


if __name__ == "__main__":
    raise SystemExit(main())
