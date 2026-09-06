const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TOKEN = process.argv[2];
const REPO = 'yudiharyono1991-hash/Masjid-Citra-Sentul-Raya';
const BRANCH = 'main';

async function fetchGH(endpoint, options = {}) {
  const url = `https://api.github.com/repos/${REPO}/${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers
    }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${err}`);
  }
  return res.json();
}

async function run() {
  console.log('Fetching remote branch info...');
  const ref = await fetchGH(`git/ref/heads/${BRANCH}`);
  const latestCommitSha = ref.object.sha;
  
  const commit = await fetchGH(`git/commits/${latestCommitSha}`);
  const baseTreeSha = commit.tree.sha;
  
  console.log('Fetching remote tree...');
  const remoteTree = await fetchGH(`git/trees/${baseTreeSha}?recursive=1`);
  const remoteHashes = new Map();
  for (const item of remoteTree.tree) {
    if (item.type === 'blob') {
      remoteHashes.set(item.path, item.sha);
    }
  }

  function getLocalFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of list) {
      if (['node_modules', '.git', 'dist', '.system_generated', '.vercel', 'github_push.js'].includes(item.name)) continue;
      const full = path.join(dir, item.name);
      const rel = path.relative('.', full).replace(/\\/g, '/');
      if (item.isDirectory()) {
        results = results.concat(getLocalFiles(full));
      } else {
        results.push(rel);
      }
    }
    return results;
  }

  const localFiles = getLocalFiles('.');
  const updates = [];

  console.log('Detecting changes...');
  for (const rel of localFiles) {
    const buf = fs.readFileSync(rel);
    // Try original buffer
    const header = Buffer.from('blob ' + buf.length + '\0');
    const hash = crypto.createHash('sha1').update(header).update(buf).digest('hex');
    
    // Try LF normalized buffer for git hash checking
    const lfBuf = Buffer.from(buf.toString('binary').replace(/\r\n/g, '\n'), 'binary');
    const lfHeader = Buffer.from('blob ' + lfBuf.length + '\0');
    const lfHash = crypto.createHash('sha1').update(lfHeader).update(lfBuf).digest('hex');
    
    let isModified = false;
    if (!remoteHashes.has(rel)) {
      isModified = true;
    } else if (remoteHashes.get(rel) !== hash && remoteHashes.get(rel) !== lfHash) {
      isModified = true;
    }
    
    if (isModified) {
      updates.push(rel);
    }
  }

  if (updates.length === 0) {
    console.log('No changes detected to push.');
    return;
  }

  console.log(`Found ${updates.length} files to update. Uploading blobs...`);
  const treeItems = [];
  for (const file of updates) {
    const buf = fs.readFileSync(file);
    const base64 = buf.toString('base64');
    const blobRes = await fetchGH('git/blobs', {
      method: 'POST',
      body: JSON.stringify({ content: base64, encoding: 'base64' })
    });
    treeItems.push({
      path: file,
      mode: '100644',
      type: 'blob',
      sha: blobRes.sha
    });
    console.log(`Uploaded ${file}`);
  }

  console.log('Creating new tree...');
  const newTreeRes = await fetchGH('git/trees', {
    method: 'POST',
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: treeItems
    })
  });
  
  console.log('Creating commit...');
  const d = new Date();
  const commitMsg = `feat: update modul surat menyurat, sinkronisasi cloud & optimasi admin dashboard\n\nAuto-committed on ${d.toISOString()}`;
  const newCommitRes = await fetchGH('git/commits', {
    method: 'POST',
    body: JSON.stringify({
      message: commitMsg,
      tree: newTreeRes.sha,
      parents: [latestCommitSha]
    })
  });
  
  console.log('Updating branch reference...');
  await fetchGH(`git/refs/heads/${BRANCH}`, {
    method: 'PATCH',
    body: JSON.stringify({
      sha: newCommitRes.sha
    })
  });
  
  console.log('Success! Commit pushed to GitHub.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
