#!/usr/bin/env python3
"""
Start one or more servers, wait for them to be ready, run a command, then clean up.

Usage:
    # Single Next.js server
    python scripts/with_server.py --server "npm run dev" --port 3000 -- python automation.py

    # Production build test
    python scripts/with_server.py --server "npm run build && npm start" --port 3000 -- python test.py

    # Multiple servers (e.g., backend + frontend)
    python scripts/with_server.py \
      --server "cd backend && python server.py" --port 8000 \
      --server "cd frontend && npm run dev" --port 3000 \
      -- python test.py
"""

import subprocess
import socket
import time
import sys
import argparse
import signal
import os


def is_server_ready(port, host='localhost', timeout=60):
    """Wait for server to be ready by polling the port."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with socket.create_connection((host, port), timeout=1):
                return True
        except (socket.error, ConnectionRefusedError):
            time.sleep(0.5)
    return False


def kill_process_tree(pid):
    """Kill a process and all its children."""
    try:
        import psutil
        parent = psutil.Process(pid)
        children = parent.children(recursive=True)
        for child in children:
            child.terminate()
        parent.terminate()
        gone, alive = psutil.wait_procs(children + [parent], timeout=5)
        for p in alive:
            p.kill()
    except ImportError:
        # Fallback if psutil not available
        os.killpg(os.getpgid(pid), signal.SIGTERM)
    except Exception:
        pass


def main():
    parser = argparse.ArgumentParser(
        description='Run command with one or more servers',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  %(prog)s --server "npm run dev" --port 3000 -- python test.py
  %(prog)s --server "npm start" --port 3000 --timeout 120 -- pytest tests/
        '''
    )
    parser.add_argument(
        '--server', action='append', dest='servers', required=True,
        help='Server command (can be repeated for multiple servers)'
    )
    parser.add_argument(
        '--port', action='append', dest='ports', type=int, required=True,
        help='Port for each server (must match --server count)'
    )
    parser.add_argument(
        '--timeout', type=int, default=60,
        help='Timeout in seconds per server (default: 60)'
    )
    parser.add_argument(
        '--env', action='append', dest='env_vars', default=[],
        help='Environment variables in KEY=VALUE format'
    )
    parser.add_argument(
        'command', nargs=argparse.REMAINDER,
        help='Command to run after server(s) ready'
    )

    args = parser.parse_args()

    # Remove the '--' separator if present
    if args.command and args.command[0] == '--':
        args.command = args.command[1:]

    if not args.command:
        print("Error: No command specified to run")
        sys.exit(1)

    # Validate server/port count
    if len(args.servers) != len(args.ports):
        print("Error: Number of --server and --port arguments must match")
        sys.exit(1)

    # Parse environment variables
    env = os.environ.copy()
    for env_var in args.env_vars:
        if '=' in env_var:
            key, value = env_var.split('=', 1)
            env[key] = value

    servers = []
    for cmd, port in zip(args.servers, args.ports):
        servers.append({'cmd': cmd, 'port': port})

    server_processes = []

    def cleanup():
        """Clean up all servers."""
        print(f"\nStopping {len(server_processes)} server(s)...")
        for i, process in enumerate(server_processes):
            try:
                kill_process_tree(process.pid)
                print(f"Server {i+1} stopped")
            except Exception as e:
                print(f"Warning: Could not stop server {i+1}: {e}")
        print("All servers stopped")

    # Set up signal handlers
    signal.signal(signal.SIGINT, lambda s, f: (cleanup(), sys.exit(130)))
    signal.signal(signal.SIGTERM, lambda s, f: (cleanup(), sys.exit(143)))

    try:
        # Start all servers
        for i, server in enumerate(servers):
            print(f"Starting server {i+1}/{len(servers)}: {server['cmd']}")

            process = subprocess.Popen(
                server['cmd'],
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env,
                preexec_fn=os.setsid  # Create new process group
            )
            server_processes.append(process)

            # Wait for this server to be ready
            print(f"Waiting for server on port {server['port']}...")
            if not is_server_ready(server['port'], timeout=args.timeout):
                # Check if process died
                if process.poll() is not None:
                    stdout, stderr = process.communicate()
                    print(f"Server failed to start. Exit code: {process.returncode}")
                    print(f"Stdout: {stdout.decode()[:500]}")
                    print(f"Stderr: {stderr.decode()[:500]}")
                raise RuntimeError(
                    f"Server failed to start on port {server['port']} "
                    f"within {args.timeout}s"
                )

            print(f"✓ Server ready on port {server['port']}")

        print(f"\n✓ All {len(servers)} server(s) ready\n")
        print(f"Running: {' '.join(args.command)}\n")
        print("-" * 60)

        # Run the command
        result = subprocess.run(args.command, env=env)

        print("-" * 60)
        print(f"\nCommand exited with code: {result.returncode}")

        sys.exit(result.returncode)

    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)

    finally:
        cleanup()


if __name__ == '__main__':
    main()