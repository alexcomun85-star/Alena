import hashlib, http.client, json, tempfile, threading, unittest
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

class GateTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.folder=Path(self.tmp.name)
        salt=b'0123456789abcdef';self.password='Test-member-password-42'
        (self.folder/'afit_access.json').write_text(json.dumps({'salt':salt.hex(),'secret':'ab'*32,'password_hash':hashlib.pbkdf2_hmac('sha256',self.password.encode(),salt,260000).hex()}))
        class Handler(BaseHTTPRequestHandler):
            calls=0
            def log_message(self,*args):pass
            def send_json(self,status,data):
                body=json.dumps(data).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
            def do_GET(self):self.send_json(200,{'status':'ok'})
            def do_POST(self):
                data=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
                Handler.calls+=1;self.send_json(200,{'answer':data['message']})
        code=Path(__file__).parents[1].joinpath('scripts/afit_access_gate.py').read_text().replace('/state/',str(self.folder)+'/')
        scope={'Handler':Handler,'json':json};exec(compile(code,'gate.py','exec'),scope)
        self.Handler=Handler;self.scope=scope;self.cookie='';self.start()
    def start(self):
        self.http=HTTPServer(('127.0.0.1',0),self.Handler)
        self.thread=threading.Thread(target=self.http.serve_forever,daemon=True);self.thread.start()
    def stop(self):self.http.shutdown();self.http.server_close();self.thread.join()
    def tearDown(self):self.stop();self.tmp.cleanup()
    def request(self,path,data=None,cookie=None,origin=None,ip=None):
        conn=http.client.HTTPConnection('127.0.0.1',self.http.server_port)
        headers={'Content-Type':'application/json'}
        if cookie is None:cookie=self.cookie
        if cookie:headers['Cookie']=cookie
        if origin:headers['Origin']=origin
        if ip:headers['X-Real-IP']=ip
        conn.request('GET' if data is None else 'POST',path,None if data is None else json.dumps(data),headers)
        res=conn.getresponse();body=json.loads(res.read());status=res.status
        header=res.getheader('Set-Cookie')
        if header:
            self.assertIn('Secure',header);self.assertIn('HttpOnly',header);self.assertIn('SameSite=Lax',header)
            self.cookie=header.split(';')[0]
        conn.close();return status,body
    def test_exact_limit_persistence_and_members(self):
        self.assertEqual(self.request('/session')[1]['remaining'],5)
        for n in range(5):self.assertEqual(self.request('/chat',{'message':str(n)})[0],200)
        self.assertEqual(self.Handler.calls,5)
        self.assertEqual(self.request('/session')[1]['remaining'],0)
        self.assertEqual(self.request('/chat',{'message':'31'})[0],401)
        self.assertEqual(self.Handler.calls,5)
        self.stop();self.start()
        self.assertEqual(self.request('/chat',{'message':'after restart'})[0],401)
        self.assertEqual(self.request('/member-login',{'login':'Alex','password':'wrong'})[0],401)
        self.assertEqual(self.request('/member-login',{'login':'Alex','password':self.password})[0],200)
        self.assertTrue(self.request('/session')[1]['member'])
        self.assertEqual(self.request('/chat',{'message':'member'})[0],200)
        self.assertEqual(self.Handler.calls,6)
        self.stop();self.start();self.assertTrue(self.request('/session')[1]['member'])
    def test_bad_requests_forgery_and_rate_limit(self):
        self.assertEqual(self.request('/chat',{'message':''})[0],400)
        self.assertEqual(self.request('/session')[1]['remaining'],5)
        self.assertEqual(self.request('/chat',{'message':'x'},origin='https://evil.example')[0],403)
        self.assertEqual(self.request('/session',cookie='afit_session='+'a'*48+'.'+'b'*64)[1]['remaining'],5)
        for i in range(5):self.assertEqual(self.request('/member-login',{'login':'A','password':'wrong'})[0],401)
        self.assertEqual(self.request('/member-login',{'login':'A','password':self.password})[0],429)
        self.assertEqual(self.Handler.calls,0)
    def test_daily_reset(self):
        for n in range(5):self.assertEqual(self.request('/chat',{'message':'x'})[0],200)
        with self.scope['_af_db']() as db:
            db.execute('UPDATE guest_chat_daily SET day=day-1')
            db.execute('UPDATE sessions SET used_day=used_day-1')
        self.assertEqual(self.request('/session')[1]['remaining'],5)
        self.assertEqual(self.request('/chat',{'message':'next day'})[0],200)
    def test_closing_new_session_and_forged_cookies_do_not_reset(self):
        for n in range(3):self.assertEqual(self.request('/chat',{'message':'hello'})[0],200)
        self.assertEqual(self.request('/session',cookie='')[1]['remaining'],2)
        self.assertEqual(self.request('/session',cookie='afit_session='+'a'*48+'.'+'b'*64)[1]['remaining'],2)
        self.stop();self.start()
        self.assertEqual(self.request('/session',cookie='')[1]['remaining'],2)
        for n in range(2):self.assertEqual(self.request('/chat',{'message':'last'},cookie='')[0],200)
        self.assertEqual(self.request('/chat',{'message':'blocked'},cookie='')[0],401)
        self.assertEqual(self.Handler.calls,5)
        with self.scope['_af_db']() as db:
            actor=db.execute('SELECT actor FROM guest_chat_daily').fetchone()[0]
            self.assertEqual(len(actor),64)
            self.assertNotIn('127.0.0.1',actor)
    def test_migration_preserves_current_session_usage(self):
        self.request('/session')
        with self.scope['_af_db']() as db:
            db.execute('DELETE FROM guest_chat_daily')
            db.execute('UPDATE sessions SET used=3')
        self.assertEqual(self.request('/session')[1]['remaining'],2)
    def test_forwarded_visitors_have_separate_counters(self):
        for n in range(3):self.assertEqual(self.request('/chat',{'message':'x'},cookie='',ip='203.0.113.10')[0],200)
        self.assertEqual(self.request('/session',cookie='',ip='203.0.113.10')[1]['remaining'],2)
        self.assertEqual(self.request('/session',cookie='',ip='203.0.113.11')[1]['remaining'],5)
    def test_existing_routes_work(self):self.assertEqual(self.request('/health')[1]['status'],'ok')

if __name__=='__main__':unittest.main()
