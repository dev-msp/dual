"""
Client for interacting with mpv's JSON IPC interface.

# https://mpv.io/manual/master/#json-ipc
"""

import json
import logging
import os
import socket
import subprocess
import time
from enum import Enum


class LoadfileOption(str, Enum):
    """Options for the loadfile command."""
    APPEND = 'append'
    APPEND_PLAY = 'append-play'
    REPLACE = 'replace'


def pid_is_active(pid):
    """Check if a PID is active."""
    logging.info('Checking if pid %s is active', pid)
    if not pid.isdigit():
        return False
    cmd = ['ps', '-p', pid]
    output = subprocess.run(cmd, capture_output=True)
    logging.debug('ps output: %s', output)
    return output.returncode == 0


def pid_from_socket_path(socket_path):
    """Get the pid from a socket path."""
    return socket_path.decode('utf-8').split('/')[-1]


def get_mpv_socket():
    """Wait for the mpv socket to be ready."""
    socket_path = '/tmp/mpv-socket-dual'
    cmd = ['mpv', '--idle=yes', '--no-terminal', '--video=no', f'--input-ipc-server={socket_path}']
    print(cmd)
    process = subprocess.Popen(cmd)
    logging.info('Started mpv process with pid %s', process.pid)

    num_tries = 0
    while num_tries < 10:
        if (os.path.exists(socket_path)):
            break
        to_sleep = 0.1 * 1.3**num_tries
        logging.info(
            'Waiting for socket path to be set (sleeping for %s)',
            to_sleep
        )
        time.sleep(to_sleep)
        num_tries += 1

    if num_tries >= 10:
        raise ValueError('Could not get socket path')

    return socket_path, process


class MpvClient:
    """Client for interacting with mpv's JSON IPC interface."""

    def __init__(self):
        """Initialize the client."""
        socket_path, process = get_mpv_socket()

        print(socket_path)

        self.socket_path = socket_path
        self.process = process

    def kill(self):
        """Kill the mpv process."""
        logging.info('Quitting mpv process')
        self._command({'command': ['quit', '0']})
        # remove the socket file
        os.remove(self.socket_path)

    def _send(self, command):
        """Send a command to the mpv socket."""
        with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as sock:
            sock.connect(self.socket_path)
            sock.sendall(command.encode('utf-8'))
            response = sock.recv(1024)
        return response

    def _send_and_parse(self, command: str):
        logging.debug('Sending command: %s', command)
        response = self._send(command)
        for line in response.decode('utf-8').split('\n'):
            if line == '':
                continue
            return json.loads(line)

    def _command(self, command):
        return self._send_and_parse(json.dumps(command) + '\n')

    def _property(self, name):
        return self._command({'command': ['get_property', name]})

    def observe_property(self, name):
        """Observe a property."""
        return self._command({'command': ['observe_property', 1, name]})

    def unobserve_property(self, name):
        """Unobserve a property."""
        return self._command({'command': ['unobserve_property', name]})

    def observe_property_until(self, name, value):
        """Observe a property until it is equal to value."""
        self.observe_property(name)
        while self._property(name) != value:
            time.sleep(0.1)
        self.unobserve_property(name)

    def enqueue(self, paths, mode=LoadfileOption.APPEND):
        """Enqueue a list of paths."""
        match mode:
            case LoadfileOption.APPEND_PLAY | LoadfileOption.REPLACE as initial:
                path = paths.pop(0)
                self._command({'command': ['loadfile', path, initial]})
        for path in paths:
            self._command({'command': ['loadfile', path, 'append']})

    def pause(self):
        """Pause the current track."""
        return self._command({'command': ['set_property', 'pause', True]})

    def play(self):
        """Play the current track."""
        return self._command({'command': ['set_property', 'pause', False]})

    def stop(self):
        """Stop the current track."""
        return self._command({'command': ['stop']})

    def current_track(self):
        """Get the current track."""
        return self.get_property('path')

    def loadfile(self, path):
        """Load a file."""
        return self._command({'command': ['loadfile', path]})

    def get_property(self, name):
        """Get a property."""
        return self._property(name)

    def get_time_pos(self):
        """Get the current time position."""
        return self.get_property('time-pos')

    def get_duration(self):
        """Get the current track duration."""
        return self.get_property('duration')

    def get_filename(self):
        """Get the current track filename."""
        return self.get_property('filename')
