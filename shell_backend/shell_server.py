from flask import Flask, request, jsonify
from flask_cors import CORS
import time

app = Flask(__name__)
CORS(app)

state = {
    "processes": [],
    "memory": {"total": 2048, "used": 0},
    "files": {"root": []},
    "cwd": "root"
}

def add_process(name, priority, memory):
    pid = str(int(time.time() * 1000))
    state["processes"].append({
        "id": pid,
        "name": name,
        "priority": priority,
        "memory": memory,
        "state": "ready"
    })
    state["memory"]["used"] += memory
    return f"Process {name} added with PID {pid}"

def remove_process(pid):
    proc = next((p for p in state["processes"] if p["id"] == pid), None)
    if proc:
        state["processes"].remove(proc)
        state["memory"]["used"] -= proc["memory"]
        return f"Process {pid} terminated"
    return f"No process with PID {pid}"

def list_processes():
    if not state["processes"]:
        return "No processes running."
    rows = ["PID       NAME       PRIORITY  MEMORY  STATE"]
    for p in state["processes"]:
        rows.append(f"{p['id']} {p['name']} {p['priority']} {p['memory']} {p['state']}")
    return "\n".join(rows)

def show_memory():
    used = state["memory"]["used"]
    total = state["memory"]["total"]
    return f"Memory Usage: {used}KB / {total}KB"

def create_file(filename):
    dir_files = state["files"].get(state["cwd"], [])
    if filename in [f['name'] for f in dir_files]:
        return f"File '{filename}' already exists."
    dir_files.append({"name": filename, "content": ""})
    state["files"][state["cwd"]] = dir_files
    return f"File '{filename}' created."

def remove_file(filename):
    dir_files = state["files"].get(state["cwd"], [])
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
    return "  ".join([f['name'] for f in dir_files]) or "Empty directory."

def cd(dirname):
    if dirname not in state["files"]:
        return f"No such directory: {dirname}"
    state["cwd"] = dirname
    return f"Current directory: {dirname}"

@app.route("/run", methods=["POST"])
def run_custom_shell():
    data = request.get_json() or {}
    cmd_line = data.get("command", "").strip()
    if not cmd_line:
        return jsonify({"output": "", "error": "Empty command"})

    parts = cmd_line.split()
    cmd = parts[0].lower()

    try:
        if cmd == "add" and len(parts) == 4:
            name = parts[1]
            priority = int(parts[2])
            memory = int(parts[3])
            output = add_process(name, priority, memory)
        elif cmd == "ps":
            output = list_processes()
        elif cmd == "kill" and len(parts) == 2:
            output = remove_process(parts[1])
        elif cmd == "mem":
            output = show_memory()
        elif cmd == "mkdir" and len(parts) == 2:
            output = mkdir(parts[1])
        elif cmd == "rmdir" and len(parts) == 2:
            output = rmdir(parts[1])
        elif cmd == "ls":
            output = ls()
        elif cmd == "cd" and len(parts) == 2:
            output = cd(parts[1])
        elif cmd == "touch" and len(parts) == 2:
            output = create_file(parts[1])
        elif cmd == "rm" and len(parts) == 2:
            output = remove_file(parts[1])
        else:
            output = f"Unknown or invalid command: {cmd_line}"
        return jsonify({"output": output, "error": ""})
    except Exception as e:
        return jsonify({"output": "", "error": str(e)})

if __name__ == "__main__":
    app.run(port=8000, debug=True)
