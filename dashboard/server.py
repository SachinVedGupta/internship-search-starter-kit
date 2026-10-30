#!/usr/bin/env python3
"""Local-only internship workspace. Python standard library; no cloud connections."""
import argparse
import datetime as dt
from contextlib import contextmanager
import json
import os
from pathlib import Path
import secrets
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit
import re

KINDS = ('applications', 'profile', 'resumes', 'writing', 'sync', 'settings')
STAGES = ('Need Action', 'Applied', 'OA', 'Interviewing', 'Offer')
PRIORITIES = ('Priority', 'Strong', 'Selective', 'Skip')
AVAILABILITY = ('unverified', 'open', 'closed', 'blocked')
STATIC = Path(__file__).parent / 'static'
MAX_BODY = 8 * 1024 * 1024

class Problem(Exception):
    def __init__(self, message, status=400):
        self.status = status
        super().__init__(message)

def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()

def checked_url(value):
    if value and (not isinstance(value, str) or urlsplit(value).scheme not in ('https', 'http') or not urlsplit(value).netloc):
        raise Problem('Links must be complete http or https URLs.')

def validate(kind, data, previous=None):
    if kind not in KINDS or not isinstance(data, dict):
        raise Problem('Unknown record type or invalid record.')
    if len(json.dumps(data)) > 250_000:
        raise Problem('Record is too large.')
    data = json.loads(json.dumps(data))
    for key in ('title', 'company', 'url', 'requisition', 'term', 'location', 'priority', 'stage', 'availability', 'outcome', 'posted_date', 'found_on', 'verified_at', 'applied_date', 'eligibility', 'submission_evidence', 'next_action', 'notes', 'sources', 'organization', 'maturity', 'source_state', 'dates', 'content', 'category', 'version', 'pdf_url', 'source_file_url', 'sha256', 'page_format', 'review', 'sections', 'review_evidence', 'prompt', 'destination', 'status', 'evidence', 'name', 'target_term', 'roles', 'locations', 'goals', 'tracker_url', 'profile_url', 'archive_url', 'dashboard_url', 'resume_id'):
        if key in data and not isinstance(data[key], str):
            raise Problem('Expected text for ' + key + '.')
    if 'archived' in data and not isinstance(data['archived'], bool):
        raise Problem('Archive flag must be true or false.')
    if kind != 'settings' and not data.get('title', '').strip():
        raise Problem('A title is required.')
    for key in ('url', 'source_url', 'pdf_url', 'source_file_url', 'tracker_url', 'profile_url', 'archive_url', 'dashboard_url'):
        checked_url(data.get(key))
    if kind == 'applications':
        if not data.get('company', '').strip():
            raise Problem('An employer is required.')
        if data.get('stage') not in STAGES or data.get('priority') not in PRIORITIES or data.get('availability') not in AVAILABILITY:
            raise Problem('Choose a supported stage, priority and availability.')
        if data['stage'] != 'Need Action' and (not data.get('submission_evidence') or not data.get('applied_date')):
            raise Problem('A submitted stage requires a submission date and labelled evidence.')
        if data.get('outcome', 'active') not in ('active', 'rejected', 'withdrawn', 'accepted', 'declined'):
            raise Problem('Invalid application outcome.')
        questions = data.get('questions', [])
        if not isinstance(questions, list) or len(questions) > 100:
            raise Problem('Invalid question list.')
        prior = {q['id']: q for q in (previous or {}).get('questions', [])}
        ids = set()
        for q in questions:
            if not isinstance(q, dict) or not isinstance(q.get('id'), str) or not isinstance(q.get('prompt'), str) or not q['prompt'].strip() or q['id'] in ids:
                raise Problem('Each question needs a unique ID and prompt.')
            ids.add(q['id'])
            if any(not isinstance(q.get(k, ''), str) for k in ('answer', 'condition', 'grounding', 'required')):
                raise Problem('Question fields must contain text.')
            if q.get('review') not in ('Draft', 'Needs review', 'User-approved', 'Blocked'):
                raise Problem('Invalid question review status.')
            old = prior.get(q['id'])
            if old and any(old.get(k) != q.get(k) for k in ('prompt', 'answer', 'choices', 'condition', 'grounding', 'required')):
                q['review'] = 'Needs review'
        if previous and any(data.get(k) != previous.get(k) for k in ('sources', 'eligibility', 'resume_id')):
            for q in questions:
                if q['id'] in prior and q.get('review') == 'User-approved':
                    q['review'] = 'Needs review'
    if kind in ('writing', 'resumes') and data.get('review', 'Draft') not in ('Draft', 'Needs review', 'User-approved', 'Blocked'):
        raise Problem('Invalid review status.')
    if kind == 'sync' and data.get('status') not in ('Pending', 'Written not verified', 'Verified', 'Conflict', 'Blocked', 'Not applicable'):
        raise Problem('Invalid sync status.')
    if kind == 'writing' and previous and any(data.get(k) != previous.get(k) for k in ('content', 'prompt', 'sources')):
        data['review'] = 'Needs review'
    if kind == 'resumes':
        digest = data.get('sha256', '')
        if digest and (len(digest) != 64 or any(c not in '0123456789abcdefABCDEF' for c in digest)):
            raise Problem('SHA-256 must contain 64 hexadecimal characters, or stay blank.')
        if previous and any(data.get(k) != previous.get(k) for k in ('pdf_url', 'source_file_url', 'sha256', 'version', 'sections')):
            data['review'] = 'Needs review'
        if data.get('review') == 'User-approved' and not data.get('review_evidence'):
            raise Problem('Record what exact PDF/source was inspected before recording approval.')
    if kind == 'sync' and data.get('status') == 'Verified' and not data.get('evidence'):
        raise Problem('Record actual changed-field readback evidence before marking verified.')
    return data

class Store:
    def __init__(self, directory):
        self.directory = Path(directory).expanduser().resolve()
        self.directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.path = self.directory / 'workspace.sqlite3'
        with self.connect() as db:
            db.execute('CREATE TABLE IF NOT EXISTS records (kind TEXT, id TEXT, revision INTEGER, updated_at TEXT, data TEXT, PRIMARY KEY(kind,id))')
            db.execute('CREATE TABLE IF NOT EXISTS history (kind TEXT, id TEXT, revision INTEGER, updated_at TEXT, data TEXT, PRIMARY KEY(kind,id,revision))')
        os.chmod(self.path, 0o600)

    @contextmanager
    def connect(self):
        db = sqlite3.connect(str(self.path), timeout=10)
        db.row_factory = sqlite3.Row
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    @staticmethod
    def decode(row):
        return dict(row, data=json.loads(row['data']))

    def state(self):
        with self.connect() as db:
            records = [self.decode(r) for r in db.execute('SELECT * FROM records ORDER BY updated_at DESC')]
        return {'schema_version': 1, 'mode': 'local_only', 'records': records}

    def save(self, kind, record_id, expected, data):
        if not isinstance(record_id, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,100}', record_id) or not isinstance(expected, int):
            raise Problem('Invalid record identity or revision.')
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute('SELECT * FROM records WHERE kind=? AND id=?', (kind, record_id)).fetchone()
            if (row['revision'] if row else 0) != expected:
                raise Problem('This record changed in another tab. Close the editor, refresh and reconcile your changes.', 409)
            data = validate(kind, data, json.loads(row['data']) if row else None)
            if kind == 'applications':
                for other in db.execute('SELECT id,data FROM records WHERE kind=? AND id<>?', (kind, record_id)):
                    existing = json.loads(other['data'])
                    same_req = data.get('requisition') and data.get('requisition') == existing.get('requisition') and data['company'].casefold() == existing.get('company', '').casefold()
                    same_url = data.get('url') and data.get('url') == existing.get('url')
                    if same_req or same_url:
                        raise Problem('This exact URL or employer/requisition already exists. Open the existing record.', 409)
            revision, stamp = expected + 1, now()
            value = json.dumps(data, ensure_ascii=False)
            db.execute('INSERT OR REPLACE INTO records VALUES (?,?,?,?,?)', (kind, record_id, revision, stamp, value))
            db.execute('INSERT INTO history VALUES (?,?,?,?,?)', (kind, record_id, revision, stamp, value))
        return {'kind': kind, 'id': record_id, 'revision': revision, 'updated_at': stamp, 'data': data}

    def history(self, kind, record_id):
        with self.connect() as db:
            return [self.decode(r) for r in db.execute('SELECT * FROM history WHERE kind=? AND id=? ORDER BY revision DESC', (kind, record_id))]

    def export(self):
        with self.connect() as db:
            db.execute('BEGIN')  # Records and history must share one consistent snapshot.
            return {'schema_version': 1, 'exported_at': now(), 'mode': 'local_only',
                    'records': [self.decode(r) for r in db.execute('SELECT * FROM records')],
                    'history': [self.decode(r) for r in db.execute('SELECT * FROM history')]}

    def restore(self, payload):
        if not isinstance(payload, dict) or payload.get('schema_version') != 1:
            raise Problem('This is not a version 1 dashboard backup.')
        records, history = payload.get('records'), payload.get('history')
        if not isinstance(records, list) or not isinstance(history, list):
            raise Problem('Backup must include records and history.')
        validated = {}
        for table, rows in (('records', records), ('history', history)):
            values, seen = [], set()
            for row in rows:
                if not isinstance(row, dict):
                    raise Problem('Invalid backup record.')
                kind, rid, revision = row.get('kind'), row.get('id'), row.get('revision')
                if not isinstance(rid, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,100}', rid) or not isinstance(revision, int) or revision < 1:
                    raise Problem('Invalid backup identity/revision.')
                key = (kind, rid) if table == 'records' else (kind, rid, revision)
                if key in seen:
                    raise Problem('Duplicate backup identity.')
                seen.add(key)
                stamp = row.get('updated_at')
                if not isinstance(stamp, str):
                    raise Problem('Missing backup timestamp.')
                value = validate(kind, row.get('data'))
                values.append((kind, rid, revision, stamp, json.dumps(value, ensure_ascii=False)))
            validated[table] = values
        latest = {(r[0], r[1]): (r[2], r[4]) for r in validated['records']}
        audit = {(r[0], r[1], r[2]): r[4] for r in validated['history']}
        if any(audit.get((k[0], k[1], v[0])) != v[1] for k, v in latest.items()):
            raise Problem('Backup history does not match current records.')
        if any((r[0], r[1]) not in latest or r[2] > latest[(r[0], r[1])][0] for r in validated['history']):
            raise Problem('Orphan or future backup history.')
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            if db.execute('SELECT COUNT(*) FROM records').fetchone()[0]:
                raise Problem('Restore only into an empty workspace. Existing records will never be overwritten.', 409)
            for table in ('records', 'history'):
                db.executemany('INSERT INTO ' + table + ' VALUES (?,?,?,?,?)', validated[table])
        return {'restored': len(records)}

    def markdown(self):
        lines = ['# Internship workspace export', '', 'Local records only; cloud sync is not automatic.', '']
        for r in self.state()['records']:
            lines += ['## ' + r['kind'] + ': ' + r['data'].get('title', 'Settings'), '',
                      'Record: ' + r['id'] + ' | revision ' + str(r['revision']), '']
            for key, value in r['data'].items():
                if value not in ('', None, []):
                    lines += ['**' + key + '**', '', json.dumps(value, ensure_ascii=False, indent=2) if isinstance(value, (list, dict)) else str(value), '']
        return '\n'.join(lines)

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass  # Avoid logging personal paths or request payloads.

    def reply(self, status, body, content_type='application/json'):
        if not isinstance(body, bytes):
            body = (json.dumps(body, ensure_ascii=False) if content_type == 'application/json' else body).encode()
        self.send_response(status)
        self.send_header('Content-Type', content_type + ('; charset=utf-8' if content_type.startswith('text/') or content_type == 'application/json' else ''))
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
        self.end_headers()
        self.wfile.write(body)

    def guard(self, token=False):
        if self.headers.get('Host') != self.server.allowed_host:
            raise Problem('Host not allowed. Open the printed loopback URL.', 403)
        origin = self.headers.get('Origin')
        if origin and origin != 'http://' + self.server.allowed_host:
            raise Problem('Cross-origin access denied.', 403)
        if self.headers.get('Sec-Fetch-Site') == 'cross-site':
            raise Problem('Cross-site access denied.', 403)
        if token and not secrets.compare_digest(self.headers.get('X-Workspace-Token', ''), self.server.token):
            raise Problem('Refresh the dashboard to renew your local session.', 403)

    def body(self):
        if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
            raise Problem('JSON requests are required.', 415)
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            raise Problem('Invalid content length.')
        if length <= 0 or length > MAX_BODY:
            raise Problem('Request exceeds the 8 MB limit or is empty.', 413)
        try:
            return json.loads(self.rfile.read(length))
        except (ValueError, UnicodeError):
            raise Problem('Invalid JSON.')

    def route(self):
        self.guard()
        path = urlsplit(self.path).path
        store = self.server.store
        if self.command == 'GET':
            if path == '/api/session':
                return self.reply(200, {'token': self.server.token})
            if path.startswith('/api/'):
                self.guard(token=True)
                if path == '/api/state':
                    return self.reply(200, store.state())
                if path == '/api/export':
                    return self.reply(200, store.export())
                if path == '/api/export.md':
                    return self.reply(200, store.markdown(), 'text/markdown')
                parts = path.split('/')
                if len(parts) == 5 and parts[2] == 'history':
                    return self.reply(200, store.history(parts[3], parts[4]))
            assets = {'/': ('index.html', 'text/html'), '/app.js': ('app.js', 'text/javascript'), '/styles.css': ('styles.css', 'text/css')}
            if path in assets:
                file, mime = assets[path]
                return self.reply(200, (STATIC / file).read_bytes(), mime)
        if self.command == 'POST':
            self.guard(token=True)
            payload = self.body()
            if path == '/api/save' and isinstance(payload, dict):
                return self.reply(200, store.save(payload.get('kind'), payload.get('id'), payload.get('expected_revision'), payload.get('data')))
            if path == '/api/restore':
                return self.reply(200, store.restore(payload))
        raise Problem('Not found.', 404)

    def handle_request(self):
        try:
            self.route()
        except Problem as error:
            self.reply(error.status, {'error': str(error)})
        except Exception:
            self.reply(500, {'error': 'Unable to complete operation. Your last saved records are retained.'})
    do_GET = handle_request
    do_POST = handle_request

def make_server(directory, port=8765):
    server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    server.allowed_host = '127.0.0.1:' + str(server.server_port)
    server.token = secrets.token_urlsafe(32)
    server.store = Store(directory)
    return server

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--data-dir', type=Path, default=Path.home() / '.internship-search-workspace')
    args = parser.parse_args()
    os.umask(0o077)
    server = make_server(args.data_dir, args.port)
    print('Internship workspace: http://' + server.allowed_host, flush=True)
    print('Local-only. Data directory: ' + str(server.store.directory), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == '__main__':
    main()
