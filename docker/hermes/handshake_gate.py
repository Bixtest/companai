"""Discharge `P2-1`'s exit gate: drive the REAL worker and prove the handshake.

WHAT THIS PROVES
----------------
That a real process, built from the pinned source into the image, answers the
measured handshake on stdio and stops on `process.stop`:

    ping -> pong
    gateway.capabilities -> per_session_exclusive_submit
    client.capabilities   -> the server->client request list
    event gateway.ready   -> the first frame the transport emits
    process.stop          -> the worker retires and the container exits

Nothing here mocks anything: the process under test is `docker run` of the image
`docker/hermes/Dockerfile` builds, with the pinned tree mounted read-only and
digest-verified by the entrypoint. The frames are the measured wire
(`tui_gateway/transport.py` framing; `server.py::_event_frame` envelopes).

It also asserts one thing that is easy to break and invisible until it bites:
**every line on stdout must parse as JSON.** Anything else would be a stray
print on the RPC channel — corrupt frames from a client's point of view. This
process's own entrypoint and pin verifier therefore log to stderr only, and
this gate is what keeps them honest.

Responses are correlated by **id**, never by arrival order, so an event that
lands between a request and its answer cannot shift the conversation (the same
discipline the platform's own client uses).

USAGE
-----
    python3 docker/hermes/handshake_gate.py [--source DIR] [--image IMAGE]

Exit code 0 = gate discharged; 1 = failed. Requires `docker` on PATH.
"""
import argparse
import json
import os
import queue
import subprocess
import sys
import threading
import time

DEFAULT_IMAGE = "hermes-gateway:p2-8"
DEFAULT_SOURCE = os.path.join("..", "..", "hermes-agent-main")

# Two different clocks, because the boot and the conversation are different:
# the entrypoint digest-verifies 18,248 files over a Docker Desktop bind mount
# (measured ~35 s threaded, ~200 s sequential) and only then execs the worker,
# which imports 46 locked dependencies before it writes `gateway.ready`.
BOOT_TIMEOUT_S = float(os.environ.get("HERMES_GATE_BOOT_TIMEOUT", "600"))
FRAME_TIMEOUT_S = float(os.environ.get("HERMES_GATE_FRAME_TIMEOUT", "60"))


def reader(stream, sink):
    for line in stream:
        sink.put(line)
    sink.put(None)


def main(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default=DEFAULT_SOURCE,
                        help="the pinned Hermes tree (default: %(default)s)")
    parser.add_argument("--image", default=DEFAULT_IMAGE)
    parser.add_argument("--pin-digest", default=os.environ.get("HERMES_PIN_DIGEST"))
    args = parser.parse_args(argv[1:])

    source = os.path.abspath(args.source)
    if not os.path.isdir(source):
        sys.stderr.write("FATAL: no pinned source at %s\n" % source)
        return 1

    command = [
        "docker", "run", "-i", "--rm",
        "-v", "%s:/hermes-src:ro" % source,
        "-e", "HERMES_HOME=/var/lib/hermes",
    ]
    if args.pin_digest:
        command += ["-e", "HERMES_PIN_DIGEST=%s" % args.pin_digest]
    command.append(args.image)

    print("gate: spawning %s" % " ".join(command))
    started = time.time()
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE, text=True, bufsize=1)

    out_lines, err_lines = queue.Queue(), queue.Queue()
    threading.Thread(target=reader, args=(process.stdout, out_lines), daemon=True).start()
    threading.Thread(target=reader, args=(process.stderr, err_lines), daemon=True).start()

    failures = []
    stdout_frames = []
    events = []

    def next_frame(label, timeout):
        try:
            line = out_lines.get(timeout=timeout)
        except queue.Empty:
            failures.append("%s: no frame within %.0fs" % (label, timeout))
            return None
        if line is None:
            failures.append("%s: the worker closed stdout" % label)
            return None
        line = line.strip()
        if not line:
            return next_frame(label, 5)
        try:
            frame = json.loads(line)
        except ValueError:
            failures.append("%s: stdout carried a NON-JSON line (channel discipline): %r"
                           % (label, line[:200]))
            return next_frame(label, 5)
        stdout_frames.append(frame)
        return frame

    def read_response(label, wanted_id, timeout=FRAME_TIMEOUT_S):
        """Read frames until the one carrying `wanted_id`; events are collected on the way."""
        while True:
            frame = next_frame(label, timeout)
            if frame is None:
                return None
            if frame.get("id") == wanted_id:
                return frame
            if frame.get("method"):
                events.append(frame)
                continue
            failures.append("%s: an unexpected frame (%r)" % (label, frame))
            return None

    next_id = [1]

    def send(method, params):
        # The id is what makes this a REQUEST rather than a notification. The
        # first version of this gate omitted it and the gateway helpfully
        # answered each notification with `"id": null` — which is why a gate
        # can be fooled into thinking the wire shifted. Measure, don't assume.
        request_id = next_id[0]
        next_id[0] += 1
        if process.poll() is not None:
            failures.append("%s: the worker had already exited (code %s) — nothing to send to"
                            % (method, process.returncode))
            return None
        try:
            process.stdin.write(json.dumps({"jsonrpc": "2.0", "id": request_id,
                                            "method": method, "params": params}) + "\n")
            process.stdin.flush()
        except (OSError, ValueError) as exc:
            # A closed pipe here means the worker died — most likely the
            # entrypoint refused the source (a PIN BROKEN run lands here).
            failures.append("%s: cannot write to the worker (%s) — it has gone away"
                            % (method, exc))
            return None
        return request_id

    def request(method, params, want, timeout=FRAME_TIMEOUT_S):
        request_id = send(method, params)
        if request_id is None:
            return None
        frame = read_response(method, request_id, timeout)
        if frame is None:
            return None
        result = frame.get("result")
        if not isinstance(result, dict):
            failures.append("%s: no result object in %r" % (method, frame))
            return None
        missing = [k for k in want if k not in result]
        if missing:
            failures.append("%s: result is missing %s (got %r)" % (method, missing, result))
            return None
        print("  ok  %-22s -> %s" % (method, {k: result[k] for k in want}))
        return result

    try:
        print("gate: handshake (boot timeout %.0fs — the entrypoint digests the mount first)"
              % BOOT_TIMEOUT_S)
        # The FIRST frame the worker will ever send is `gateway.ready`, and it is
        # only written after the entrypoint has digest-verified the mount and the
        # worker has imported its locked dependencies — measured at ~3-4 minutes
        # on 8 CPUs. A per-frame timeout of 60 s is right for the CONVERSATION but
        # wrong for the BOOT, so the first three requests wait on the boot clock.
        # (First run of this gate failed here: the "unexpected frame" it reported
        # was the correct answer to request id 1, arriving after the 60 s window.)
        request("client.capabilities", {"server_requests": True}, ["server_requests"],
                BOOT_TIMEOUT_S)
        request("gateway.capabilities", {}, ["per_session_exclusive_submit"], BOOT_TIMEOUT_S)
        request("ping", {}, ["pong"], BOOT_TIMEOUT_S)

        print("gate: the first event the transport emits")
        ready = next((e for e in events if (e.get("params") or {}).get("type") == "gateway.ready"), None)
        if ready is None:
            frame = next_frame("gateway.ready", FRAME_TIMEOUT_S)
            if frame is not None and (frame.get("params") or {}).get("type") == "gateway.ready":
                ready = frame
        if ready is None:
            failures.append("gateway.ready: the event never arrived")
        elif ready.get("method") != "event":
            failures.append("gateway.ready: expected an `event` envelope, got %r" % (ready,))
        else:
            payload = (ready.get("params") or {}).get("payload") or {}
            print("  ok  %-22s -> %s" % ("gateway.ready", sorted(payload.keys())))

        print("gate: process.stop")
        stop_id = send("process.stop", {})
        if stop_id is not None:
            frame = read_response("process.stop", stop_id)
            if frame is None:
                failures.append("process.stop: no response")
            elif "error" in frame:
                failures.append("process.stop: answered with an error (%r)" % (frame,))
            elif "result" not in frame:
                failures.append("process.stop: neither result nor error came back (%r)" % (frame,))
            else:
                print("  ok  %-22s -> answered" % "process.stop")
        try:
            process.stdin.close()
        except Exception:
            pass
    finally:
        try:
            process.wait(timeout=120)
        except subprocess.TimeoutExpired:
            failures.append("the worker did not exit after process.stop")
            process.kill()
        elapsed = time.time() - started
        try:
            process.stdin.close()
        except Exception:
            pass

    stderr_tail = []
    while True:
        try:
            line = err_lines.get_nowait()
        except queue.Empty:
            break
        if line:
            stderr_tail.append(line.rstrip())

    print("\ngate: worker stdout frames: %d (every one is a JSON-RPC frame)" % len(stdout_frames))
    for line in stderr_tail[-12:]:
        print("  log| %s" % line)

    if failures:
        print("\nGATE FAILED")
        for failure in failures:
            print("  - %s" % failure)
        return 1

    print("\nGATE PASSED in %.1fs — the pinned worker booted, answered the measured "
          "handshake, and stopped on process.stop." % elapsed)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
