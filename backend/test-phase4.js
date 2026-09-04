const { spawn } = require('child_process');
const http = require('http');

const p = spawn('npm', ['run', 'dev'], { cwd: 'C:\\VisitorBMC\\backend', stdio: ['pipe', 'pipe', 'pipe'], shell: true });
p.stdout.on('data', d => {});
p.stderr.on('data', d => {});

const post = (path, body, cookie) => new Promise((res, rej) => {
  const b = JSON.stringify(body);
  const h = {'Content-Type':'application/json','Content-Length':Buffer.byteLength(b)};
  if (cookie) h['Cookie'] = cookie;
  const req = http.request({hostname:'localhost',port:3000,path,method:'POST',headers:h}, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res({status:r.statusCode,body:d,setCookie:r.headers['set-cookie']})); });
  req.on('error',rej); req.write(b); req.end();
});

const get = (path, cookie) => new Promise((res, rej) => {
  const h = {}; if (cookie) h['Cookie'] = cookie;
  const req = http.request({hostname:'localhost',port:3000,path,method:'GET',headers:h}, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res({status:r.statusCode,body:d})); });
  req.on('error',rej); req.end();
});

async function waitForServer(ms) {
  while (ms > 0) {
    try { const r = await get('/api/health'); if (r.status===200) return; } catch {}
    ms-=500; await new Promise(r=>setTimeout(r,500));
  }
  throw new Error('Server timeout');
}

async function run() {
  await waitForServer(15000);
  console.log('=== Server up ===');

  const l = await post('/api/auth/login', {username:'admin',password:'admin123'});
  console.log('Login:', l.status, l.body);
  let c = '';
  if (l.setCookie) for (const sc of l.setCookie) if (sc.startsWith('jwt=')) c = sc.split(';')[0];

  const cl = await get('/api/companies', c);
  console.log('Companies list:', cl.status);

  const cc = await post('/api/companies', {companyName: 'PT Test Alpha'}, c);
  console.log('Create company:', cc.status, cc.body);
  let companyId = 0;
  try { companyId = JSON.parse(cc.body).id; } catch {}

  const cc2 = await post('/api/companies', {companyName: 'PT Test Alpha'}, c);
  console.log('Duplicate company:', cc2.status, cc2.body);

  const cs = await get('/api/companies/search?q=PT', c);
  console.log('Company search:', cs.status, 'count:', JSON.parse(cs.body).length);

  if (companyId) {
    const vc = await post('/api/visitors', {visitorName: 'Test Visitor', companyId, phoneNumber: '08123456789'}, c);
    console.log('Create visitor:', vc.status);
    let visitorBody = {};
    try { visitorBody = JSON.parse(vc.body); } catch {}
    console.log('  Code:', visitorBody.visitor?.visitorCode);

    const vc2 = await post('/api/visitors', {visitorName: 'Test Visitor', companyId, phoneNumber: '08123456789'}, c);
    console.log('Duplicate visitor:', vc2.status);

    const vc3 = await post('/api/visitors', {visitorName: 'Test Visitor', companyId, phoneNumber: '08999999999'}, c);
    console.log('Same name diff phone:', vc3.status);

    const vd = await get('/api/visitors?companyId=' + companyId, c);
    console.log('Visitors by company:', vd.status, JSON.parse(vd.body).total, 'visitors');
  }

  const cf = await get('/api/companies/1', c);
  console.log('Get company 1:', cf.status, cf.body);

  console.log('\n=== All tests done ===');
  p.kill();
  setTimeout(() => process.exit(0), 1000);
}

run().catch(e => { console.error('Error:', e.message); p.kill(); process.exit(1); });
