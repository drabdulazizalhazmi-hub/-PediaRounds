/** Runs only against an isolated, in-memory Postgres engine with fictional data. */
import assert from 'node:assert/strict';
import {TABLES,validateSnapshot,buildArchiveSql} from './snapshot.mjs';
if(!process.env.PEDIAROUNDS_PGLITE_MODULE)throw Error('Set PEDIAROUNDS_PGLITE_MODULE to a local @electric-sql/pglite 0.5.8 module path');
const {PGlite}=await import(process.env.PEDIAROUNDS_PGLITE_MODULE);
const db=new PGlite();
const payload=JSON.stringify({note:'Original مراجعة\n $pr_0$ $pr_1$ '.repeat(8000),ids:['legacy:q1']});
const cells={user_id:'fictional-legacy-user',question_id:'legacy:q1',bank:'original-bank',payload,revision:3,
  updated_at:1700000000123,created_at:1700000000000,completed_at:1700000000123,seen_at:1700000000000,
  correct:1,marked:0,confidence:null,email:'fictional@example.test',display_name:"O'Reilly $pr_0$ $pr_1$"};
const snapshot={format:'pediarounds-sites-snapshot-v1',source:{projectId:'fictional-project',binding:'DB',snapshotId:'fictional-export',exportedAt:'2026-09-12T00:00:00Z',consistency:'database-snapshot'},
  tables:Object.fromEntries(Object.entries(TABLES).map(([k,columns])=>[k,{columns,rows:[Object.fromEntries(columns.map(c=>[c,cells[c]]))]}]))};
const validated=validateSnapshot(snapshot),sql=buildArchiveSql(snapshot,validated.manifest);
try {
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  await db.exec(sql);
  const restored=await db.query('SELECT source_table,original_row FROM pediarounds_legacy_private.records');
  assert.equal(restored.rows.length,8);
  for(const row of restored.rows)assert.deepEqual(row.original_row,snapshot.tables[row.source_table].rows[0]);
  await db.exec(sql);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM pediarounds_legacy_private.records')).rows[0].n,8);
  for(const role of ['anon','authenticated']) {
    await db.exec('SET ROLE '+role);
    await assert.rejects(db.query('SELECT * FROM pediarounds_legacy_private.records'),/permission denied/);
    await db.exec('RESET ROLE');
  }
  // A conflicting retry must roll back even rows it successfully inserts before the final comparison.
  await db.exec("DELETE FROM pediarounds_legacy_private.records WHERE source_table='seen_questions'; UPDATE pediarounds_legacy_private.records SET original_row='{}'::jsonb WHERE source_table='user_profiles';");
  await assert.rejects(db.exec(sql),/Snapshot restore mismatch/);
  await db.exec('ROLLBACK;');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM pediarounds_legacy_private.records')).rows[0].n,7);
  console.log(JSON.stringify({engine:'PGlite 0.5.8',exactEightTableRestore:true,longPayloadPreserved:true,idempotentRetry:true,anonymousDenied:true,authenticatedDenied:true,conflictingRetryRolledBack:true,hostedDatabaseModified:false}));
} finally {await db.close();}
