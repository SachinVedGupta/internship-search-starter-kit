import http.client
import json
from pathlib import Path
import sys
import tempfile
import threading
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server import Store, Problem, make_server


def application():
    return {'title': 'Fictional software intern', 'company': 'Example Systems', 'priority': 'Strong', 'stage': 'Need Action', 'availability': 'unverified', 'outcome': 'active', 'questions': []}

class StoreTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = Store(self.temp.name)
    def tearDown(self):
        self.temp.cleanup()
    def test_persistence_and_conflict_preserve_human_notes(self):
        a = application()
        a['notes'] = 'Human-written note'
        self.store.save('applications', 'one', 0, a)
        a['next_action'] = 'Review role'
        self.store.save('applications', 'one', 1, a)
        with self.assertRaises(Problem) as caught:
            self.store.save('applications', 'one', 1, dict(a, notes='stale overwrite'))
        self.assertEqual(caught.exception.status, 409)
        fresh = Store(self.temp.name)
        self.assertEqual(fresh.state()['records'][0]['data']['notes'], 'Human-written note')
        self.assertEqual(len(fresh.history('applications', 'one')), 2)
    def test_draft_cannot_be_marked_submitted_without_evidence(self):
        a = dict(application(), stage='Applied')
        with self.assertRaises(Problem): self.store.save('applications', 'one', 0, a)
        a.update(applied_date='2026-10-30', submission_evidence='Fictional test observation only')
        self.assertEqual(self.store.save('applications', 'one', 0, a)['data']['stage'], 'Applied')
    def test_duplicate_exact_identity_but_distinct_requisitions_survive(self):
        a = dict(application(), requisition='REQ-A')
        self.store.save('applications', 'one', 0, a)
        with self.assertRaises(Problem): self.store.save('applications', 'two', 0, a)
        self.store.save('applications', 'two', 0, dict(a, requisition='REQ-B'))
        self.assertEqual(len(self.store.state()['records']), 2)
    def test_review_invalidates_on_question_change_and_resume_change(self):
        a = application()
        a['questions'] = [{'id':'q1','prompt':'Why this role?','answer':'My test answer','review':'User-approved'}]
        self.store.save('applications', 'one', 0, a)
        a['questions'][0]['answer'] = 'Changed test answer'
        saved = self.store.save('applications', 'one', 1, a)
        self.assertEqual(saved['data']['questions'][0]['review'], 'Needs review')
        a = saved['data']; a['questions'][0]['review'] = 'User-approved'
        self.store.save('applications', 'one', 2, a)
        a['resume_id'] = 'new-resume'
        saved = self.store.save('applications', 'one', 3, a)
        self.assertEqual(saved['data']['questions'][0]['review'], 'Needs review')
    def test_resume_and_writing_review_invalidates(self):
        for kind, data, key in [('resumes', {'title':'Test resume','pdf_url':'https://example.com/test.pdf','review':'User-approved','review_evidence':'Test fixture only'}, 'pdf_url'), ('writing', {'title':'Test story','content':'Original','review':'User-approved'}, 'content')]:
            self.store.save(kind, 'one', 0, data)
            data[key] = 'https://example.com/new.pdf' if kind == 'resumes' else 'Changed'
            self.assertEqual(self.store.save(kind, 'one', 1, data)['data']['review'], 'Needs review')
    def test_sync_verification_needs_readback_and_partial_states_survive(self):
        base = {'title':'Test change','status':'Verified'}
        with self.assertRaises(Problem): self.store.save('sync', 'one', 0, base)
        self.store.save('sync', 'one', 0, dict(base, evidence='Fictional destination readback fixture'))
        self.store.save('sync', 'two', 0, {'title':'Second destination','status':'Blocked'})
        states = {r['id']:r['data']['status'] for r in self.store.state()['records']}
        self.assertEqual(states, {'one':'Verified','two':'Blocked'})
    def test_export_restore_preserves_history_and_never_overwrites(self):
        a = application(); self.store.save('applications','one',0,a)
        self.store.save('applications','one',1,dict(a,notes='Preserve me'))
        backup = self.store.export()
        with tempfile.TemporaryDirectory() as d:
            destination = Store(d); destination.restore(backup)
            self.assertEqual(destination.export()['records'], backup['records'])
            self.assertEqual(destination.export()['history'], backup['history'])
            with self.assertRaises(Problem): destination.restore(backup)
        self.assertIn('Preserve me', self.store.markdown())
    def test_invalid_restore_is_atomic(self):
        a = application(); self.store.save('applications','one',0,a)
        backup = self.store.export(); backup['history'] = []
        with tempfile.TemporaryDirectory() as d:
            destination = Store(d)
            with self.assertRaises(Problem): destination.restore(backup)
            self.assertEqual(destination.state()['records'], [])
    def test_untrusted_urls_types_and_paths_rejected(self):
        for data in [dict(application(),url='javascript:alert(1)'),dict(application(),company={}),dict(application(),archived='yes')]:
            with self.assertRaises(Problem): self.store.save('applications','one',0,data)
        with self.assertRaises(Problem):self.store.save('profile','../bad',0,{'title':'test'})

class HTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.server = make_server(cls.temp.name, 0)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown(); cls.server.server_close(); cls.thread.join(); cls.temp.cleanup()
    def request(self, path, method='GET', data=None, headers=None):
        c=http.client.HTTPConnection('127.0.0.1',self.server.server_port,timeout=5)
        h={'Content-Type':'application/json',**(headers or {})}
        c.request(method,path,body=json.dumps(data) if data is not None else None,headers=h)
        r=c.getresponse(); result=(r.status,r.read(),dict(r.getheaders()));c.close();return result
    def test_private_routes_require_local_session_token(self):
        self.assertEqual(self.request('/api/state')[0],403)
        status,body,headers=self.request('/api/session')
        self.assertEqual(status,200); self.assertEqual(headers['Cache-Control'],'no-store')
        token=json.loads(body)['token']
        self.assertEqual(self.request('/api/state',headers={'X-Workspace-Token':token})[0],200)
    def test_host_origin_and_cross_site_denial(self):
        for headers in [{'Host':'attacker.example'},{'Origin':'https://attacker.example'},{'Sec-Fetch-Site':'cross-site'}]:
            self.assertEqual(self.request('/api/session',headers=headers)[0],403)
        headers={'X-Workspace-Token':self.server.token,'Origin':'https://attacker.example'}
        self.assertEqual(self.request('/api/save','POST',{},headers)[0],403)
    def test_static_allowlist_and_save_readback(self):
        self.assertEqual(self.request('/')[0],200)
        for path in ['/server.py','/../server.py','/.git/config','/workspace.sqlite3']:
            self.assertEqual(self.request(path)[0],404)
        h={'X-Workspace-Token':self.server.token}
        payload={'kind':'profile','id':'http-test','expected_revision':0,'data':{'title':'HTTP fixture','content':'Saved and read back'}}
        self.assertEqual(self.request('/api/save','POST',payload,h)[0],200)
        records=json.loads(self.request('/api/state',headers=h)[1])['records']
        self.assertEqual(records[0]['data']['content'],'Saved and read back')

if __name__ == '__main__':unittest.main()
