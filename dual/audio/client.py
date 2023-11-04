# client for interacting with mpv's JSON IPC interface
# https://mpv.io/manual/master/#json-ipc

import json
import logging
import os
import socket
import time
import redis
import subprocess

from enum import Enum


class LoadfileOption(str, Enum):
    append = 'append'
    append_play = 'append-play'
    replace = 'replace'


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
    return socket_path.decode('utf-8').split('/')[-1]


def get_mpv_socket(redis_client):
    process = subprocess.Popen(
        ['mpv', '--idle=yes', '--no-terminal', '--profile=music']
    )
    logging.info('Started mpv process with pid %s', process.pid)
    redis_client.set(
        'mpv-socket/current',
        f'/tmp/mpv-socket-{process.pid}',
    )

    socket_path = None
    num_tries = 0
    while socket_path is None and num_tries < 10:
        current = redis_client.get('mpv-socket/current')
        if (
            current is not None and
                current.decode('utf-8').endswith(str(process.pid)) and
                os.path.exists(current.decode('utf-8'))
        ):
            socket_path = current
            break
        to_sleep = 0.1 * 1.3**num_tries
        logging.info(
            'Waiting for socket path to be set (sleeping for %s)',
            to_sleep
        )
        time.sleep(to_sleep)
        num_tries += 1

    if socket_path is None:
        raise Exception('Could not get socket path from redis')

    if not pid_is_active(pid_from_socket_path(socket_path)):
        raise Exception('Could not connect to mpv socket')

    return socket_path.decode('utf-8'), process


class MpvClient:
    def __init__(self):
        """Initialize the client."""
        redis_client = redis.Redis()
        socket_path, process = get_mpv_socket(redis_client)

        self.socket_path = socket_path
        self.process = process

    def kill(self):
        """Kill the mpv process."""
        logging.info('Quitting mpv process')
        self._command({'command': ['quit', '0']})

    def _send(self, command):
        with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as s:
            s.connect(self.socket_path)
            s.sendall(command.encode('utf-8'))
            response = s.recv(1024)
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
        return self._command({'command': ['observe_property', 1, name]})

    def unobserve_property(self, name):
        return self._command({'command': ['unobserve_property', name]})

    def observe_property_until(self, name, value):
        self.observe_property(name)
        while self._property(name) != value:
            time.sleep(0.1)
        self.unobserve_property(name)

    def enqueue(self, paths, mode=LoadfileOption.append):
        match mode:
            case LoadfileOption.append_play | LoadfileOption.replace as initial:
                path = paths.pop(0)
                self._command({'command': ['loadfile', path, initial]})
        for path in paths:
            self._command({'command': ['loadfile', path, 'append']})

    def pause(self):
        return self._command({'command': ['set_property', 'pause', True]})

    def play(self):
        return self._command({'command': ['set_property', 'pause', False]})

    def stop(self):
        return self._command({'command': ['stop']})

    def current_track(self):
        return self.get_property('path')

    def loadfile(self, path):
        return self._command({'command': ['loadfile', path]})

    def get_property(self, name):
        return self._property(name)

    def get_time_pos(self):
        return self.get_property('time-pos')

    def get_duration(self):
        return self.get_property('duration')

    def get_filename(self):
        return self.get_property('filename')
