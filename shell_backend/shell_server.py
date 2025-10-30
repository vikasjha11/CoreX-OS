# ---------- Imports ----------
from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import shlex

app = Flask(__name__)
CORS(app)
# ---------- Global Runtime State ----------
state = {
    "processes": [],"memory": {"total": 2048, "used": 0},"files": {"root": []},  
    "cwd": "root","algorithm": "FCFS","quantum": 4,
    # Scheduler simulation
    "clock": 0,"running": None,"ready": [],          
    # Extras
    "start_time": time.time(),"log_enabled": True,"history": [],"events": [],"cache_kb": 0         
}

def snapshot():
    return {
        "processes": state["processes"],"memory": state["memory"],"files": state["files"],"cwd": state["cwd"],
        "algorithm": state["algorithm"],"quantum": state["quantum"],"clock": state["clock"],"running": state["running"],
        "ready": state["ready"],"log_enabled": state["log_enabled"],"cache_kb": state["cache_kb"],
    }
# ---------- Command Registry ----------
COMMANDS = {
    # System & help
    "help": "Show this help","commands": "List all command names", "clear": "Signal UI to clear terminal","sysstate": "Show compact system state (alias: state)","date": "Show current server date/time","history": "Show executed commands","log <on|off>": "Enable or disable command logging","whoami": "Show current user context",
    # Scheduler/process management
    "add <name> <priority:int> <memory:int> [burst:int=5]": "Add a process to the scheduler",
    "ps": "List processes","queue": "Show ready queue","run [ticks:int=1]": "Advance scheduler by ticks (alias: tick)",
    "kill <pid>": "Terminate a process by PID","wait <pid> [max_ticks:int=1000]": "Block until process completes (simulated fast-forward)","pstree": "Show process hierarchy","schedinfo": "Show scheduling algorithm & quantum","timeline": "Show execution timeline",
    # Virtual FS
    "mkdir <dir>": "Create a directory","rmdir <dir>": "Remove an empty directory",
    "ls": "List directories and files","cd <dir>": "Change current directory",
    "touch <f>": "Create an empty file","rm <f>": "Remove a file",
    "cat <f>": "Show file contents","write <f> <content>": "Write content to a file",
    # Memory/info
    "meminfo": "Show total, used, free memory","memusage <pid>": "Show memory usage for a process",
    # Extras (stubs you can extend)
    "reset": "Reset the system state",
}

def _command_names():
    return sorted({k.split()[0] for k in COMMANDS.keys()})

def _help_text():
    lines = ["Commands:"]
    for usage, desc in COMMANDS.items():
        lines.append(f"  {usage}  |  {desc}")
    return "\n".join(lines)

# ---------- Utility Helpers ----------
def _get_proc(pid):
    return next((p for p in state["processes"] if p["id"] == pid), None)

def _format_table(rows):
    if not rows:
        return ""
    widths = [max(len(str(row[i])) for row in rows) for i in range(len(rows[0]))]
    out = []
    for r, row in enumerate(rows):
        parts = [str(val).ljust(widths[i]) for i, val in enumerate(row)]
        out.append(("  ".join(parts)).rstrip())
    return "\n".join(out)

def _uptime_str():
    secs = int(time.time() - state["start_time"])
    d, rem = divmod(secs, 86400)
    h, rem = divmod(rem, 3600)
    m, s = divmod(rem, 60)
    parts = []
    if d: parts.append(f"{d}d")
    if h: parts.append(f"{h}h")
    if m: parts.append(f"{m}m")
    parts.append(f"{s}s")
    return " ".join(parts)

# ---------- Virtual File System ----------
def _dir_files():
    return state["files"].setdefault(state["cwd"], [])

def create_file(filename):
    dir_files = _dir_files()
    if filename in [f['name'] for f in dir_files]:
        return f"File '{filename}' already exists."
    dir_files.append({"name": filename, "content": ""})
    return f"File '{filename}' created."

def remove_file(filename):
    dir_files = _dir_files()
    for f in dir_files:
        if f['name'] == filename:
            dir_files.remove(f)
            return f"File '{filename}' removed."
    return f"No such file: {filename}"

def mkdir(dirname):
    if dirname in state["files"]:
        return f"Directory '{dirname}' already exists."
    state["files"][dirname] = []
    return f"Directory '{dirname}' created."

def rmdir(dirname):
    if dirname == "root":
        return "Cannot remove root directory."
    if dirname not in state["files"]:
        return f"No such directory: {dirname}"
    if state["files"][dirname]:
        return f"Directory '{dirname}' is not empty."
    del state["files"][dirname]
    if state["cwd"] == dirname:
        state["cwd"] = "root"
    return f"Directory '{dirname}' removed."

def ls():
    dir_files = state["files"].get(state["cwd"], [])
    files_list = [f['name'] for f in dir_files]
    dirs_list = sorted([d for d in state["files"].keys()])
    files_str = "  ".join(files_list) if files_list else "(no files)"
    dirs_str = "  ".join(dirs_list) if dirs_list else "(no dirs)"
    return f"dirs: {dirs_str}\nfiles: {files_str}"

def cd(dirname):
    if dirname not in state["files"]:
        return f"No such directory: {dirname}"
    state["cwd"] = dirname
    return f"Current directory: {dirname}"

def cat_file(filename):
    dir_files = _dir_files()
    for f in dir_files:
        if f['name'] == filename:
            return f['content'] or ""
    return f"No such file: {filename}"

def write_file(filename, content):
    dir_files = _dir_files()
    for f in dir_files:
        if f['name'] == filename:
            f['content'] = content
            return f"Wrote {len(content)} bytes to '{filename}'."
    dir_files.append({"name": filename, "content": content})
    return f"File '{filename}' created and wrote {len(content)} bytes."

# ---------- Scheduler Functions ----------
def _enqueue_ready(pid):
    if pid is None:
        return
    if pid not in state["ready"]:
        state["ready"].append(pid)
    proc = _get_proc(pid)
    if proc:
        proc["state"] = "ready"

def _dequeue_next():
    if not state["ready"]:
        return None
    alg = state["algorithm"].upper()
    if alg in ("FCFS", "RR"):
        return state["ready"].pop(0)
    if alg == "PRIO":
        # Lower number = higher priority
        best_idx = None
        best_val = None
        for i, pid in enumerate(state["ready"]):
            p = _get_proc(pid)
            pr = p["priority"] if p else 999999
            if best_val is None or pr < best_val:
                best_val = pr
                best_idx = i
        return state["ready"].pop(best_idx) if best_idx is not None else None
    return state["ready"].pop(0)

def _context_switch_to(pid):
    prev = state["running"]
    state["running"] = pid
    if pid is None:
        return
    p = _get_proc(pid)
    if p:
        p["state"] = "running"
        p["quantum_left"] = state["quantum"] if state["algorithm"].upper() == "RR" else None
        if p.get("started_at") is None:
            p["started_at"] = state["clock"]
    state["events"].append(f"t={state['clock']}: switch {prev or '-'} -> {pid}")

def _maybe_schedule():
    if state["running"] is None:
        next_pid = _dequeue_next()
        if next_pid is not None:
            _context_switch_to(next_pid)

def _free_memory_for(proc):
    state["memory"]["used"] = max(0, state["memory"]["used"] - proc["memory"])

def add_process(name, priority, memory, burst=5):
    if burst <= 0:
        return "Burst must be > 0"
    if memory <= 0:
        return "Memory must be > 0"
    if state["memory"]["used"] + memory > state["memory"]["total"]:
        return f"Not enough memory. Requested {memory}KB, available {state['memory']['total'] - state['memory']['used']}KB."  
    pid = str(int(time.time() * 1000))
    proc = {
        "id": pid,
        "name": name,
        "priority": int(priority),
        "memory": int(memory),
        "state": "ready",
        "burst": int(burst),
        "remaining": int(burst),
        "arrival": state["clock"],
        "started_at": None,
        "quantum_left": None,
        "ppid": "0"
    }
    state["processes"].append(proc)
    state["memory"]["used"] += proc["memory"]
    _enqueue_ready(pid)
    _maybe_schedule()
    return f"Process {name} added with PID {pid} (burst={proc['burst']}, prio={proc['priority']})"

def remove_process(pid):
    proc = _get_proc(pid)
    if not proc:
        return f"No process with PID {pid}"
    if state["running"] == pid:
        state["running"] = None
    if pid in state["ready"]:
        state["ready"] = [x for x in state["ready"] if x != pid]
    try:
        state["processes"].remove(proc)
    except ValueError:
        pass
    _free_memory_for(proc)
    _maybe_schedule()
    return f"Process {pid} terminated"

def list_processes():
    if not state["processes"]:
        return "No processes."
    rows = [["PID","NAME","PRIO","MEM(KB)","STATE","REM","BURST"]]
    for p in state["processes"]:
        rows.append([p['id'], p['name'], p['priority'], p['memory'], p['state'], p['remaining'], p['burst']])
    return _format_table(rows)

def show_memory():
    used = state["memory"]["used"]
    total = state["memory"]["total"]
    return f"Memory Usage: {used}KB / {total}KB"

def _tick_once():
    _maybe_schedule()
    running = state["running"]
    if running is None:
        state["clock"] += 1
        state["events"].append(f"t={state['clock']}: idle")
        return "idle"

    p = _get_proc(running)
    if not p:
        state["running"] = None
        state["clock"] += 1
        state["events"].append(f"t={state['clock']}: idle")
        return "idle"

    p["remaining"] = max(0, p["remaining"] - 1)
    if state["algorithm"].upper() == "RR":
        p["quantum_left"] = max(0, (p["quantum_left"] or state["quantum"]) - 1)

    state["events"].append(f"t={state['clock']}: run {running}")
    state["clock"] += 1

    if p["remaining"] == 0:
        p["state"] = "terminated"
        _free_memory_for(p)
        try:
            state["processes"].remove(p)
        except ValueError:
            pass
        state["running"] = None
        state["events"].append(f"t={state['clock']}: finish {running}")
        _maybe_schedule()
        return f"finish {running}"

    if state["algorithm"].upper() == "RR" and p.get("quantum_left") == 0:
        p["state"] = "ready"
        p["quantum_left"] = None
        state["running"] = None
        _enqueue_ready(p["id"])
        state["events"].append(f"t={state['clock']}: preempt {p['id']}")
        _maybe_schedule()
        return f"preempt {p['id']}"

    return f"run {running}"

def tick(n=1):
    n = max(1, int(n))
    events = []
    for _ in range(n):
        events.append(_tick_once())
    ready_list = " -> ".join(
        [f"{_get_proc(pid)['name']}({pid})[{_get_proc(pid)['remaining']}]" for pid in state["ready"] if _get_proc(pid)]
    ) or "(empty)"
    cpu = _get_proc(state["running"])["name"] + f"({state['running']})" if state["running"] and _get_proc(state["running"]) else "(idle)"
    return f"time={state['clock']}  cpu={cpu}\nready: {ready_list}\n" + " ".join(events)

def queue_view():
    if not state["ready"]:
        return "Ready queue: (empty)"
    parts = []
    for pid in state["ready"]:
        p = _get_proc(pid)
        if p:
            parts.append(f"{p['name']}({pid}) prio={p['priority']} rem={p['remaining']}")
    return "Ready queue: " + " -> ".join(parts)

def reset_system():
    state["processes"].clear()
    state["memory"]["used"] = 0
    state["clock"] = 0
    state["running"] = None
    state["ready"].clear()
    state["events"].clear()
    return "System reset."

# ---------- Extra Commands ----------
def cmd_top():
    if not state["processes"]:
        return "No processes."
    total_ticks = max(1, state["clock"] or 1)
    rows = [["PID","NAME","PRIO","MEM","STATE","REM","CPU%","START"]]
    for p in state["processes"]:
        consumed = max(0, p["burst"] - p["remaining"])
        cpu_pct = f"{(consumed / total_ticks) * 100:0.1f}"
        start = "-" if p["started_at"] is None else p["started_at"]
        rows.append([p["id"], p["name"], p["priority"], p["memory"], p["state"], p["remaining"], cpu_pct, start])
    header, items = rows[0], rows[1:]
    items.sort(key=lambda r: (-float(r[6]), r[2]))
    return _format_table([header] + items)

def cmd_jobs():
    procs = [p for p in state["processes"] if p["state"] in ("running","ready")]
    if not procs:
        return "No jobs."
    rows = [["PID","NAME","STATE","PRIO","REM"]]
    for p in procs:
        rows.append([p["id"], p["name"], p["state"], p["priority"], p["remaining"]])
    return _format_table(rows)

def cmd_bg(args):
    if not args:
        return "Usage: bg <name> [burst] [prio] [mem]"
    name = args[0]
    burst = int(args[1]) if len(args) > 1 and args[1].isdigit() else 5
    prio = int(args[2]) if len(args) > 2 and args[2].isdigit() else 5
    mem = int(args[3]) if len(args) > 3 and args[3].isdigit() else 10
    return add_process(name, prio, mem, burst)

def cmd_wait(pid, max_ticks=1000):
    if not pid:
        return "Usage: wait <pid> [max_ticks]"
    target = _get_proc(pid)
    if not target:
        return f"No process with PID {pid}"
    n = int(max_ticks)
    steps = 0
    while _get_proc(pid) and steps < n:
        _tick_once()
        steps += 1
    return f"wait: {'completed' if not _get_proc(pid) else 'timeout'} after {steps} ticks"

def cmd_fg(pid):
    if not pid:
        return "Usage: fg <pid>"
    if _get_proc(pid) is None:
        return f"No process with PID {pid}"
    cur = state["running"]
    if cur and cur != pid:
        p = _get_proc(cur)
        if p:
            p["state"] = "ready"
            p["quantum_left"] = None
            _enqueue_ready(cur)
    if pid in state["ready"]:
        state["ready"] = [x for x in state["ready"] if x != pid]
    _context_switch_to(pid)
    return f"Foreground: {pid}"

def cmd_nice(pid, prio):
    p = _get_proc(pid)
    if not p:
        return f"No process with PID {pid}"
    try:
        pr = int(prio)
    except Exception:
        return "Usage: nice <pid> <priority:int>"
    p["priority"] = pr
    return f"PID {pid} priority set to {pr}"

def cmd_pstree():
    if not state["processes"]:
        return "(no processes)"
    children = {}
    for p in state["processes"]:
        children.setdefault(p.get("ppid","0"), []).append(p)
    def fmt(pid, indent=""):
        procs = children.get(pid, [])
        out = []
        for i, p in enumerate(sorted(procs, key=lambda x: x["name"])):
            branch = "└─ " if i == len(procs)-1 else "├─ "
            out.append(f"{indent}{branch}{p['name']}({p['id']}) prio={p['priority']} rem={p['remaining']}")
            out.extend(fmt(p["id"], indent + ("   " if i == len(procs)-1 else "│  ")))
        return out
    root = ["root"]
    root += fmt("0", "")
    return "\n".join(root)

def cmd_schedinfo():
    return f"alg={state['algorithm']}  quantum={state['quantum']}"

def cmd_timeline():
    if not state["events"]:
        return "(no events)"
    return "\n".join(state["events"][-50:])

def cmd_meminfo():
    total = state["memory"]["total"]
    used = state["memory"]["used"]
    free = max(0, total - used)
    return f"Mem: total={total}KB used={used}KB free={free}KB cache={state['cache_kb']}KB"

def cmd_memusage(pid):
    if not pid:
        return "Usage: memusage <pid>"
    p = _get_proc(pid)
    if not p:
        return f"No process with PID {pid}"
    return f"PID {pid} mem={p['memory']}KB"
# ---------- HTTP API ----------
@app.get("/state")
def get_state():
    return jsonify(snapshot())
@app.get("/commands")
def list_commands():
    return jsonify({"commands": _command_names(), "usage": COMMANDS})
@app.post("/run")
def run_custom_shell():
    data = request.get_json() or {}
    cmd_line = (data.get("command") or "").strip()
    if not cmd_line:
        return jsonify({"output": "", "error": "Empty command", "state": snapshot()})
    try:
        parts = shlex.split(cmd_line)
    except Exception:
        parts = cmd_line.split()
    if not parts:
        return jsonify({"output": "", "error": "Empty command", "state": snapshot()})
    cmd = parts[0].lower()
    args = parts[1:]
    if state["log_enabled"]:
        state["history"].append(cmd_line)
    try:
        if cmd in ("help", "?"):
            output = _help_text()
        elif cmd == "commands":
            output = " ".join(_command_names())
        elif cmd == "clear":
            output = "__CLEAR__"
        elif cmd in ("sysstate", "state"):
            s = snapshot()
            cpu = "(idle)"
            if s["running"]:
                rp = next((p for p in s["processes"] if p["id"] == s["running"]), None)
                cpu = f"{rp['name']}({rp['id']})" if rp else f"({s['running']})"
            output = (
                f"time={s['clock']}  alg={s['algorithm']}  q={s['quantum']}\n"
                f"cpu: {cpu}\n"
                f"ready: {', '.join(s.get('ready') or []) or '(empty)'}\n"
                f"procs: {len(s['processes'])}"
            )
        elif cmd == "uptime":
            output = f"uptime: {_uptime_str()}  ticks={state['clock']}"
        elif cmd == "date":
            output = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
        elif cmd == "history":
            if not state["history"]:
                output = "(empty)"
            else:
                output = "\n".join(f"{i+1}: {h}" for i, h in enumerate(state["history"][-50:]))
        elif cmd == "log" and len(args) == 1 and args[0].lower() in ("on","off"):
            state["log_enabled"] = args[0].lower() == "on"
            output = f"log={'on' if state['log_enabled'] else 'off'}"
        elif cmd == "whoami":
            output = "corex"
        # Scheduler/process management 
        elif cmd == "add" and len(args) >= 3:
            name = args[0]
            priority = int(args[1])
            memory = int(args[2])
            burst = int(args[3]) if len(args) >= 4 else 5
            output = add_process(name, priority, memory, burst)
        elif cmd == "ps":
            output = list_processes()
        elif cmd == "kill" and len(args) == 1:
            output = remove_process(args[0])
        elif cmd in ("tick", "run"):
            n = int(args[0]) if (len(args) == 1 and args[0].isdigit()) else 1
            output = tick(n)
        elif cmd == "queue":
            output = queue_view()
        elif cmd == "reset":
            output = reset_system()
        elif cmd == "setalg" and len(args) == 1:
            val = args[0].upper()
            if val not in ("FCFS", "RR", "PRIO"):
                output = "Invalid algorithm. Use FCFS, RR, PRIO."
            else:
                state["algorithm"] = val
                output = f"Scheduling algorithm set to {val}."
        elif cmd == "setq" and len(args) == 1:
            try:
                q = int(args[0])
                if q <= 0:
                    raise ValueError
                state["quantum"] = q
                output = f"Time quantum set to {q}."
            except ValueError:
                output = "Invalid quantum. Usage: setq <positive-int>"
        elif cmd == "nice" and len(args) == 2:
            output = cmd_nice(args[0], args[1])
        elif cmd == "bg":
            output = cmd_bg(args)
        elif cmd == "jobs":
            output = cmd_jobs()
        elif cmd == "wait":
            if not args:
                output = "Usage: wait <pid> [max_ticks]"
            else:
                pid = args[0]
                max_ticks = int(args[1]) if len(args) > 1 and args[1].isdigit() else 1000
                output = cmd_wait(pid, max_ticks)
        elif cmd == "fg":
            output = cmd_fg(args[0]) if args else "Usage: fg <pid>"
        elif cmd == "pstree":
            output = cmd_pstree()
        elif cmd == "schedinfo":
            output = cmd_schedinfo()
        elif cmd == "timeline":
            output = cmd_timeline()
        # Virtual FS
        elif cmd == "mkdir" and len(args) == 1:
            output = mkdir(args[0])
        elif cmd == "rmdir" and len(args) == 1:
            output = rmdir(args[0])
        elif cmd == "ls":
            output = ls()
        elif cmd == "cd" and len(args) == 1:
            output = cd(args[0])
        elif cmd == "touch" and len(args) == 1:
            output = create_file(args[0])
        elif cmd == "rm" and len(args) == 1:
            output = remove_file(args[0])
        elif cmd == "cat" and len(args) == 1:
            output = cat_file(args[0])
        elif cmd == "write" and len(args) >= 2:
            filename = args[0]
            content = " ".join(args[1:])
            output = write_file(filename, content)
        # Memory/info
        elif cmd == "meminfo":
            output = cmd_meminfo()
        elif cmd == "memusage":
            output = cmd_memusage(args[0] if args else None)
        elif cmd == "echo":
            output = " ".join(args)
        elif cmd == "ping":
            output = "pong"
        else:
            output = f"Unknown or invalid command: {cmd_line}"
        return jsonify({"output": output, "error": "", "state": snapshot()})
    except Exception as e:
        return jsonify({"output": "", "error": str(e), "state": snapshot()})

# ---------- Entrypoint ----------
if __name__ == "__main__":
    app.run(port=8000, debug=True)
