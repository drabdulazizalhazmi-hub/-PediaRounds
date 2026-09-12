import test from 'node:test';
import assert from 'node:assert/strict';
import {TABLES,validateSnapshot,verifySnapshot,buildArchiveSql} from './snapshot.mjs';

function fixture() {
  const shared={user_id:'legacy-example-user',payload:JSON.stringify({queue:['old:question-17'],note:'Original payload'}),revision:2,updated_at:1700000000123};
  const rows={
    custom_exam_attempts:[{...shared}],done_questions:[{user_id:shared.user_id,question_id:'old:question-17',correct:1,completed_at:1700000000000}],
    mock_exam_attempts:[{...shared}],question_annotations:[{user_id:shared.user_id,question_id:'old:question-17',marked:1,confidence:null,updated_at:1700000000123}],
    seen_questions:[{user_id:shared.user_id,question_id:'old:question-17',seen_at:1700000000000}],spaced_review_sessions:[{...shared,bank:'original-bank'}],
    study_sessions:[{...shared}],user_profiles:[{user_id:shared.user_id,email:'fictional@example.test',display_name:'Fictional',created_at:1700000000000,updated_at:1700000000123}]
  };
  return {format:'pediarounds-sites-snapshot-v1',source:{projectId:'fictional-project',binding:'DB',snapshotId:'fictional-snapshot',exportedAt:'2026-09-12T00:00:00.000Z',consistency:'database-snapshot'},
    tables:Object.fromEntries(Object.entries(TABLES).map(([k,v])=>[k,{columns:v,rows:rows[k]}]))};
}
test('all eight tables and original millisecond timestamps survive; no automatic account linking',()=>{
  const s=fixture(),r=validateSnapshot(s);assert.equal(Object.keys(r.tables).length,8);
  assert.deepEqual(JSON.parse(r.tables.done_questions.rows[0].data),s.tables.done_questions.rows[0]);
  assert.equal(r.summary.accountsLinked,0);assert.equal(r.summary.cutoverReady,false);
});
test('rejects real viewer failure modes: omitted rows, truncated values, next offset and incomplete pages',()=>{
  for(const p of [{truncated:true},{truncated_values:1},{omitted_rows:18},{omitted_columns:1},{next_offset:7}]) {
    const s=fixture();s.tables.study_sessions.model_projection=p;assert.throws(()=>validateSnapshot(s),/truncated_projection/);
  }
  const s=fixture();s.tables.study_sessions.has_more=true;assert.throws(()=>validateSnapshot(s),/incomplete_page/);
});
test('rejects missing or extra tables and changed columns instead of silently dropping them',()=>{
  const s=fixture();delete s.tables.custom_exam_attempts;assert.throws(()=>validateSnapshot(s),/table_set_mismatch/);
  const extra=fixture();extra.tables.new_table={columns:[],rows:[]};assert.throws(()=>validateSnapshot(extra),/table_set_mismatch/);
  const altered=fixture();altered.tables.done_questions.rows[0].extra='x';assert.throws(()=>validateSnapshot(altered),/row_columns_mismatch/);
});
test('rejects duplicate compound keys while preserving distinct banks and question IDs',()=>{
  const s=fixture();s.tables.done_questions.rows.push({...s.tables.done_questions.rows[0]});assert.throws(()=>validateSnapshot(s),/duplicate_primary_key/);
  const other=fixture();other.tables.spaced_review_sessions.rows.push({...other.tables.spaced_review_sessions.rows[0],bank:'another-bank'});
  assert.equal(validateSnapshot(other).tables.spaced_review_sessions.count,2);
});
test('detects a one-character change, deleted rows, and a different snapshot against source manifest',()=>{
  const original=fixture(),manifest=validateSnapshot(original).manifest;
  for(const mutate of [s=>s.tables.study_sessions.rows[0].payload+=' ',s=>s.tables.seen_questions.rows=[],s=>s.source.snapshotId='different']) {
    const s=structuredClone(original);mutate(s);assert.throws(()=>verifySnapshot(s,manifest),/source_manifest_mismatch/);
  }
});
test('ordering does not change hashes, but exact long Unicode payload text is preserved',()=>{
  const s=fixture();const payload=JSON.stringify({text:'مراجعة\n"quoted" $pr_0$ '.repeat(10000)});
  s.tables.study_sessions.rows[0].payload=payload;
  const r=validateSnapshot(s);assert.equal(JSON.parse(r.tables.study_sessions.rows[0].data).payload,payload);
  const reordered=structuredClone(s);reordered.tables.study_sessions.rows[0]=Object.fromEntries(Object.entries(reordered.tables.study_sessions.rows[0]).reverse());
  assert.equal(validateSnapshot(reordered).sha256,r.sha256);
});
test('retains users missing profiles and IDs absent from the new question bank',()=>{
  const s=fixture();s.tables.user_profiles.rows=[];s.tables.done_questions.rows[0].question_id='unmapped-old-id';
  const r=validateSnapshot(s);assert.equal(r.summary.usersWithoutProfile,1);assert.equal(r.tables.done_questions.count,1);
});
test('SQL archive is transactional and private; original text cannot escape the literal',()=>{
  const s=fixture();s.tables.user_profiles.rows[0].display_name="'; DROP TABLE auth.users; -- $pr_0$ $pr_1$";
  const sql=buildArchiveSql(s,validateSnapshot(s).manifest);
  assert.match(sql,/BEGIN;/);assert.match(sql,/COMMIT;/);assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/REVOKE ALL ON SCHEMA pediarounds_legacy_private FROM PUBLIC, anon, authenticated/);
  assert.match(sql,/\$pr_2\$/);assert.match(sql,/EXCEPT SELECT \* FROM pr_expected_records/);
  assert.doesNotMatch(sql,/CREATE POLICY|GRANT |UPDATE auth|INSERT INTO auth|DELETE FROM/);
});
test('unsafe numbers, malformed payloads and non-snapshot exports fail closed',()=>{
  const s=fixture();s.tables.done_questions.rows[0].completed_at=Number.MAX_SAFE_INTEGER+1;assert.throws(()=>validateSnapshot(s),/unsafe_number/);
  const malformed=fixture();malformed.tables.study_sessions.rows[0].payload='{"partial":';assert.throws(()=>validateSnapshot(malformed),/invalid_payload_json/);
  const paged=fixture();paged.source.consistency='live-paginated-view';assert.throws(()=>validateSnapshot(paged),/consistent_database_export_required/);
});
