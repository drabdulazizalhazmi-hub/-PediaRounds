/** Offline only. Restore into a separate, unused application database. */
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {TABLES,verifySnapshot} from '../render/migration/snapshot.mjs';
const integer=new Set(['revision','updated_at','created_at','completed_at','seen_at','correct','marked']);
const nullable=new Set(['correct','confidence','display_name']);
function literal(value,column) {
  if(value===null && nullable.has(column))return 'NULL';
  if(integer.has(column)) {
    if(!Number.isSafeInteger(value)||['correct','marked'].includes(column)&&![0,1].includes(value))throw Error('invalid_integer:'+column);
    return String(value);
  }
  if(typeof value!=='string')throw Error('invalid_text:'+column);
  for(let i=0;;i++){const tag='$pr_import_'+i+'$';if(!value.includes(tag))return tag+value+tag;}
}
export function buildImportSql(snapshot,manifest) {
  verifySnapshot(snapshot,manifest);
  const sql=['-- PRIVATE learner data. Never commit this generated SQL.',
    '-- Target: a separate unused database with schema.sql already installed.',
    '-- Source is never connected. Account linking and traffic switching are separate operations.',
    'BEGIN;',"SET LOCAL search_path=pg_catalog,pg_temp;",
    'LOCK TABLE '+['account_links',...Object.keys(TABLES)].map(t=>'pediarounds_portable.'+t).join(',')+' IN ACCESS EXCLUSIVE MODE;',
    "DO $guard$ BEGIN IF EXISTS(SELECT 1 FROM pediarounds_portable.account_links) THEN RAISE EXCEPTION 'Target accounts already linked: import refused'; END IF; END $guard$;"];
  for(const [table,columns] of Object.entries(TABLES)) {
    const target='pediarounds_portable.'+table,temp='pr_import_'+table,names=columns.join(',');
    sql.push('CREATE TEMP TABLE '+temp+' (LIKE '+target+' INCLUDING ALL) ON COMMIT DROP;');
    const rows=snapshot.tables[table].rows.map(r=>'('+columns.map(c=>literal(r[c],c)).join(',')+')');
    for(let i=0;i<rows.length;i+=250)sql.push('INSERT INTO '+temp+' ('+names+') VALUES '+rows.slice(i,i+250).join(',\n')+';');
    sql.push('INSERT INTO '+target+' ('+names+') SELECT '+names+' FROM '+temp+' ON CONFLICT DO NOTHING;',
      'DO $verify$ BEGIN IF EXISTS(SELECT '+names+' FROM '+temp+' EXCEPT SELECT '+names+' FROM '+target+') OR EXISTS(SELECT '+names+' FROM '+target+' EXCEPT SELECT '+names+' FROM '+temp+") THEN RAISE EXCEPTION 'Exact application restore mismatch: "+table+"'; END IF; END $verify$;");
  }
  return sql.concat('COMMIT;').join('\n')+'\n';
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const [input,manifest,output]=process.argv.slice(2);
    if(process.argv.length!==5)throw Error('Usage: import-sql.mjs SNAPSHOT SOURCE_MANIFEST PRIVATE_OUTPUT');
    writeFileSync(output,buildImportSql(JSON.parse(readFileSync(input,'utf8')),JSON.parse(readFileSync(manifest,'utf8'))),{flag:'wx',mode:0o600});
    console.log(JSON.stringify({sqlPrepared:true,executed:false,accountsLinked:0,cutoverReady:false}));
  } catch(error){console.error(error.message);process.exitCode=1;}
}
