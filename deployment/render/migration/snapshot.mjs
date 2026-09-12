/** Offline preservation gate. Never authenticates or links legacy accounts. */
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export const TABLES = Object.freeze({
  custom_exam_attempts: ['user_id','payload','revision','updated_at'],
  done_questions: ['user_id','question_id','correct','completed_at'],
  mock_exam_attempts: ['user_id','payload','revision','updated_at'],
  question_annotations: ['user_id','question_id','marked','confidence','updated_at'],
  seen_questions: ['user_id','question_id','seen_at'],
  spaced_review_sessions: ['user_id','bank','payload','revision','updated_at'],
  study_sessions: ['user_id','payload','revision','updated_at'],
  user_profiles: ['user_id','email','display_name','created_at','updated_at']
});
const PK = Object.fromEntries(Object.keys(TABLES).map(t=>[t,
  t==='spaced_review_sessions' ? ['user_id','bank'] :
  ['done_questions','seen_questions','question_annotations'].includes(t) ? ['user_id','question_id'] : ['user_id']]));
const object = v=>v!==null && typeof v==='object' && !Array.isArray(v);
const fail = code=>{throw new Error(code);};
const sameKeys = (o,keys)=>object(o) && Object.keys(o).sort().join('\0')===[...keys].sort().join('\0');
const hash = s=>createHash('sha256').update(s).digest('hex');
// Avoid locale-dependent ordering, accidental numeric coercion and lossy JSON serialization.
function canonical(value) {
  if(value===null || typeof value==='boolean')return JSON.stringify(value);
  if(typeof value==='string') {
    if(value.includes('\0') || (typeof value.isWellFormed==='function' && !value.isWellFormed()))fail('unsupported_string_encoding');
    return JSON.stringify(value);
  }
  if(typeof value==='number') {
    if(!Number.isSafeInteger(value))fail('unsafe_number');
    return JSON.stringify(value);
  }
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(object(value))return '{'+Object.keys(value).sort().map(k=>canonical(k)+':'+canonical(value[k])).join(',')+'}';
  fail('unsupported_value');
}
function projectionCheck(page) {
  if(page.has_more===true)fail('incomplete_page');
  const p=page.model_projection;
  if(p && (p.truncated || p.truncated_values || p.omitted_rows || p.omitted_columns || p.omitted_tables || p.omitted_bindings || p.next_offset!==null && p.next_offset!==undefined))fail('truncated_projection');
}
function textId(v) {return typeof v==='string' && v.length>0 && !/[\p{Cc}]/u.test(v);}
export function validateSnapshot(snapshot) {
  if(!object(snapshot))fail('invalid_snapshot');
  projectionCheck(snapshot);
  if(snapshot.format!=='pediarounds-sites-snapshot-v1' || !object(snapshot.source) || !object(snapshot.tables))fail('invalid_snapshot_format');
  const source=snapshot.source;
  if(!textId(source.projectId)||!textId(source.binding)||!textId(source.snapshotId)||!/^\d{4}-\d\d-\d\dT.*Z$/.test(source.exportedAt)||!Number.isFinite(Date.parse(source.exportedAt)))fail('invalid_source_identity');
  if(source.consistency!=='database-snapshot')fail('consistent_database_export_required');
  if(!sameKeys(snapshot.tables,Object.keys(TABLES)))fail('table_set_mismatch');
  const tables={};
  for(const [name,columns] of Object.entries(TABLES)) {
    const table=snapshot.tables[name];
    if(!object(table))fail('invalid_table:'+name);
    projectionCheck(table);
    if(!Array.isArray(table.columns)||table.columns.length!==columns.length||[...table.columns].sort().join('\0')!==[...columns].sort().join('\0'))fail('column_set_mismatch:'+name);
    if(!Array.isArray(table.rows))fail('rows_missing:'+name);
    const seen=new Set();
    const records=table.rows.map(row=>{
      if(!sameKeys(row,columns))fail('row_columns_mismatch:'+name);
      if(!PK[name].every(k=>textId(row[k])))fail('invalid_primary_key:'+name);
      const key=canonical(PK[name].map(k=>row[k]));
      if(seen.has(key))fail('duplicate_primary_key:'+name);
      seen.add(key);
      if(Object.hasOwn(row,'payload')) {
        if(typeof row.payload!=='string')fail('payload_must_remain_original_text:'+name);
        try{JSON.parse(row.payload);}catch{fail('invalid_payload_json:'+name);}
      }
      // All original columns and payload strings are retained, including unknown question IDs.
      const data=canonical(row);
      return {key,data,sha256:hash(data)};
    }).sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);
    tables[name]={rows:records,count:records.length,sha256:hash(canonical(records.map(r=>[r.key,r.sha256])))};
  }
  const profiles=new Set(snapshot.tables.user_profiles.rows.map(r=>r.user_id));
  const users=new Set(Object.values(snapshot.tables).flatMap(t=>t.rows.map(r=>r.user_id)));
  const manifest={format:'pediarounds-sites-manifest-v1',source,
    tables:Object.fromEntries(Object.entries(tables).map(([k,v])=>[k,{count:v.count,sha256:v.sha256}]))};
  return {tables,manifest,sha256:hash(canonical(manifest)),
    summary:{tables:Object.fromEntries(Object.entries(tables).map(([k,v])=>[k,v.count])),
      distinctLegacyUsers:users.size,usersWithoutProfile:[...users].filter(u=>!profiles.has(u)).length,
      accountsLinked:0,cutoverReady:false}};
}
export function verifySnapshot(snapshot,sourceManifest) {
  const result=validateSnapshot(snapshot);
  if(canonical(sourceManifest)!==canonical(result.manifest))fail('source_manifest_mismatch');
  return result;
}

// SQL values are tagged literals with delimiters checked against their contents.
// No values, names, or SQL from the input are treated as executable SQL.
function literal(value) {
  for(let n=0;;n++) {const tag='$pr_'+n+'$';if(!value.includes(tag))return tag+value+tag;}
}
export function buildArchiveSql(snapshot,sourceManifest) {
  const checked=verifySnapshot(snapshot,sourceManifest);
  const snapshotHash=literal(checked.sha256);
  const values=Object.entries(checked.tables).flatMap(([table,data])=>data.rows.map(row=>
    '('+[snapshotHash,literal(table),literal(row.key),literal(row.sha256),literal(row.data)+'::jsonb'].join(',')+')'));
  const sql=[
    '-- PRIVATE learner-data archive: never commit this output or publish it.',
    '-- Does not enable logins, link users, overwrite live progress or authorize cutover.',
    'BEGIN;',
    'SET LOCAL search_path = pg_catalog, pg_temp;',
    "SELECT pg_advisory_xact_lock(hashtextextended('pediarounds-sites-archive-v1',0));",
    'CREATE SCHEMA IF NOT EXISTS pediarounds_legacy_private;',
    'REVOKE ALL ON SCHEMA pediarounds_legacy_private FROM PUBLIC, anon, authenticated;',
    `CREATE TABLE IF NOT EXISTS pediarounds_legacy_private.snapshots (
      digest text PRIMARY KEY, manifest jsonb NOT NULL, imported_at timestamptz NOT NULL DEFAULT now());`,
    `CREATE TABLE IF NOT EXISTS pediarounds_legacy_private.records (
      snapshot_digest text NOT NULL REFERENCES pediarounds_legacy_private.snapshots(digest),
      source_table text NOT NULL, source_key text NOT NULL, source_row_sha256 text NOT NULL, original_row jsonb NOT NULL,
      PRIMARY KEY(snapshot_digest,source_table,source_key));`,
    'ALTER TABLE pediarounds_legacy_private.snapshots ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE pediarounds_legacy_private.records ENABLE ROW LEVEL SECURITY;',
    'REVOKE ALL ON ALL TABLES IN SCHEMA pediarounds_legacy_private FROM PUBLIC, anon, authenticated;',
    'CREATE TEMP TABLE pr_expected_snapshot(digest text PRIMARY KEY, manifest jsonb NOT NULL) ON COMMIT DROP;',
    `INSERT INTO pr_expected_snapshot VALUES (${snapshotHash},${literal(canonical(checked.manifest))}::jsonb);`,
    `INSERT INTO pediarounds_legacy_private.snapshots(digest,manifest)
      SELECT * FROM pr_expected_snapshot ON CONFLICT(digest) DO NOTHING;`,
    `CREATE TEMP TABLE pr_expected_records(snapshot_digest text,source_table text,source_key text,source_row_sha256 text,original_row jsonb) ON COMMIT DROP;`
  ];
  // Bound SQL statement size while retaining one transaction for the entire snapshot.
  for(let offset=0;offset<values.length;offset+=250)sql.push('INSERT INTO pr_expected_records VALUES '+values.slice(offset,offset+250).join(',\n')+';');
  sql.push(
    `INSERT INTO pediarounds_legacy_private.records SELECT * FROM pr_expected_records
      ON CONFLICT(snapshot_digest,source_table,source_key) DO NOTHING;`,
    `DO $verify$ BEGIN
      IF EXISTS (SELECT digest,manifest FROM pediarounds_legacy_private.snapshots WHERE digest=${snapshotHash}
        EXCEPT SELECT * FROM pr_expected_snapshot) THEN RAISE EXCEPTION 'Snapshot manifest mismatch'; END IF;
      IF EXISTS (SELECT * FROM pr_expected_records EXCEPT
        SELECT snapshot_digest,source_table,source_key,source_row_sha256,original_row FROM pediarounds_legacy_private.records WHERE snapshot_digest=${snapshotHash})
      OR EXISTS (SELECT snapshot_digest,source_table,source_key,source_row_sha256,original_row FROM pediarounds_legacy_private.records WHERE snapshot_digest=${snapshotHash}
        EXCEPT SELECT * FROM pr_expected_records) THEN RAISE EXCEPTION 'Snapshot restore mismatch'; END IF;
    END $verify$;`,
    'COMMIT;');
  return sql.join('\n')+'\n';
}

function main(args) {
  const [command,input,manifestFile,output]=args;
  if(!['manifest','verify','archive-sql'].includes(command) || !input || !manifestFile ||
    (command==='archive-sql'?args.length!==4:args.length!==3))fail('usage: snapshot.mjs manifest INPUT MANIFEST | verify INPUT MANIFEST | archive-sql INPUT MANIFEST OUTPUT');
  const snapshot=JSON.parse(readFileSync(input,'utf8'));
  if(command==='manifest') {
    // Generate independently at the source, never from a truncated viewer projection.
    const r=validateSnapshot(snapshot);
    writeFileSync(manifestFile,JSON.stringify(r.manifest,null,2)+'\n',{mode:0o600,flag:'wx'});
    console.log(JSON.stringify(r.summary));return;
  }
  const manifest=JSON.parse(readFileSync(manifestFile,'utf8'));
  const r=verifySnapshot(snapshot,manifest);
  if(command==='archive-sql')writeFileSync(output,buildArchiveSql(snapshot,manifest),{mode:0o600,flag:'wx'});
  console.log(JSON.stringify({...r.summary,sourceManifestMatches:true,snapshotSha256:r.sha256}));
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try{main(process.argv.slice(2));}catch(error){console.error(error.message);process.exitCode=1;}
}
