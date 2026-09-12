import hashlib, importlib.util, tempfile, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('recovery',Path(__file__).with_name('recover.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class UnitTests(unittest.TestCase):
 def test_ascii_explanation(self): self.assertTrue(m.usable('Geographic tongue usually requires reassurance.'))
 def test_arabic_rejected(self): self.assertFalse(m.usable('Explanation شرح'))
 def test_presentation_form_rejected(self): self.assertFalse(m.usable('Explanation ﺍ'))
 def test_similar_question_note_is_not_explanation(self): self.assertFalse(m.usable('Similar question (question 188) in volume collection.'))
 def test_digits_not_explanation(self): self.assertFalse(m.usable('1234'))
 def test_placeholder_rejected(self): self.assertFalse(m.usable("Didn't find an answer for this question."))
 def test_previous_is_not_own_explanation(self): self.assertFalse(m.usable('See previous question.'))
 def test_page_boundaries(self):
  x=m.split_questions([(1,'Q1) First\nExplanation:\nFirst source explanation.'),(2,'Q2) Second\nExplanation:\nSecond source explanation.')],2)
  self.assertEqual(x[1]['text'],'First source explanation.');self.assertEqual(x[2]['pages'],[2])
 def test_duplicate_number_rejected(self):
  with self.assertRaises(ValueError): m.split_questions([(1,'Q1) x\nQ1) y')],2)
 def test_missing_number_rejected(self):
  with self.assertRaises(ValueError): m.split_questions([(1,'Q1) x')],2)
 def test_traversal_rejected(self):
  with tempfile.TemporaryDirectory() as root:
   with self.assertRaises(ValueError):m.asset_path(Path(root),'master-bank/assets/derm-oph-20260907/../../escape.jpg')
 def test_wrong_asset_directory_rejected(self):
  with self.assertRaises(ValueError):m.asset_path(m.ROOT,'master-bank/data/file.json')
 def test_wrapped_records(self): self.assertEqual(len(list(m.rows({'questions':[{'id':'x','stemEn':'x'}]}))),1)
class RecoveryTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls): cls.report=m.run(apply=True)
 def test_scope(self): self.assertEqual(self.report['repositoryRecordCount'],1053)
 def test_english_coverage(self): self.assertEqual(len(self.report['sourceExplanationsRecovered']),27)
 def test_explicit_source_link(self): self.assertEqual(self.report['linkedSourceExplanationsRecovered'],['part2-ophthalmology-q03'])
 def test_exact_image_hashes(self):
  self.assertEqual(len(self.report['imagesRecovered']),28)
  for a in self.report['imagesRecovered']:self.assertEqual(hashlib.sha256((m.ROOT/a['path']).read_bytes()).hexdigest(),a['sha256'])
 def test_roles_separated(self): self.assertEqual(sum(a['role']=='question' for a in self.report['imagesRecovered']),21)
 def test_pending_images_preserved(self): self.assertEqual(len(self.report['imageManifestEntriesStillMissing']),2)
 def test_protected_fields_preserved(self):self.assertTrue(self.report['answerKeysAndReviewStatesPreserved'])
 def test_unresolved_text_is_explicit(self):self.assertEqual(len(self.report['sourceExplanationsStillMissing']),4)
 def test_idempotent(self):
  paths=[m.ROOT/p for p in self.report['changedDataFiles']];before=[p.read_bytes() for p in paths]
  m.run(apply=True);self.assertEqual(before,[p.read_bytes() for p in paths])
 def test_no_answer_graph_before_answer(self):
  for a in self.report['imagesRecovered']:self.assertEqual(a['displayBeforeAnswer'],a['role']=='question')
 def test_no_publication_claim(self):self.assertFalse(self.report['liveSiteModified']);self.assertFalse(self.report['imagePublicationRightsVerified'])
if __name__=='__main__':unittest.main()
