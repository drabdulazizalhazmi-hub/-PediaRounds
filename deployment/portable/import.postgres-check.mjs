import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TABLES,validateSnapshot} from '../render/migration/snapshot.mjs';
import {buildImportSql} from './import-sql.mjs';
if(!process.env.PEDIAROUNDS_PGLITE_MODULE)throw Error('Set PEDIAROUNDS_PGLITE_MODULE');
const {PGlite}=await import(process.env.PEDIAROUNDS_PGLITE_MODULE);
const db=new PGlite();
const cells={user_id:'fictional-original-id',question_id:'unmatched-original-question',bank:'original-bank',
  payload:JSON.stringify({note:"مراجعة O'Reilly $pr_import_0$ ".repeat(8000)}),revision:7,
  updated_at:1700000000123,created_at:1700000000000,completed_at:1700000000123,seen_at:1700000000000,
  correct:1,marked:0,confidence:null,email:'fictional@example.test',display_name:'Example'};
const snapshot={format:'pediarounds-sites-snapshot-v1',source:{projectId:'fictional-project',binding:'DB',snapshotId:'fictional-export',exportedAt:'2026-09-12T00:00:00Z',consistency:'database-snapshot'},
  tables:Object.fromEntries(Object.entries(TABLES).map(([k,columns])=>[k,{columns,rows:[Object.fromEntries(columns.map(c=>[c,cells[c]]))]}]))};
const sql=buildImportSql(snapshot,validateSnapshot(snapshot).manifest);
try {
  await db.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
  await db.exec(sql);await db.exec(sql);
  for(const table of Object.keys(TABLES))assert.deepEqual((await db.query('SELECT * FROM pediarounds_portable.'+table)).rows,snapshot.tables[table].rows);
  await db.exec('SET ROLE pediarounds_portable_runtime');
  for(const table of Object.keys(TABLES))assert.equal((await db.query('SELECT * FROM pediarounds_portable.'+table)).rows.length,0);
  await db.exec('RESET ROLE');
  await db.exec("DELETE FROM pediarounds_portable.custom_exam_attempts; UPDATE pediarounds_portable.user_profiles SET display_name='changed';");
  await assert.rejects(db.exec(sql),/Exact application restore mismatch/);await db.exec('ROLLBACK');
  assert.equal((await db.query('SELECT * FROM pediarounds_portable.custom_exam_attempts')).rows.length,0);
  await db.exec("INSERT INTO pediarounds_portable.account_links VALUES('11111111-1111-4111-8111-111111111111','fictional-original-id','owner_verified_recovery',now(),'fictional-proof')");
  await assert.rejects(db.exec(sql),/Target accounts already linked/);await db.exec('ROLLBACK');
  console.log(JSON.stringify({exactEightTableApplicationRestore:true,longTextAndIdsUnchanged:true,retryNoDuplicates:true,unclaimedUsersInaccessible:true,conflictRollsBackAllTables:true,linkedTargetRefused:true,hostedWrites:false}));
} finally {await db.close();}
