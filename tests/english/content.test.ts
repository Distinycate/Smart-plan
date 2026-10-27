import { lexicalIndex } from '../../lib/english-mastery/lexical';
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { loadPackages, validateCourseSource } from '../../lib/english-mastery/content';
import { sha } from '../../lib/english-mastery/policy';
import { unitManifest } from '../../lib/english-mastery/manifest';

let packages: Awaited<ReturnType<typeof loadPackages>>, courses: typeof packages;
before(async () => {
  packages = await loadPackages();
  courses = packages.filter(p => p.stableId.endsWith('-COURSE'));
});
function changed(edit: (p: any) => void) {
  const p = structuredClone(courses[0].payload);
  delete p.checksum;
  edit(p);
  p.checksum = sha(JSON.stringify(p));
  return p;
}
test('all 96 units have complete preview text; every level retains its original pilot', () => {
  assert.equal(packages.length, 106);
  assert.equal(courses.length, 94);
  const current = Array.from(new Map(packages.filter(p => p.version !== '0.5.0').sort((a,b) => a.version.localeCompare(b.version, undefined, {numeric:true})).map(p => [p.unitId,p])).values());
  assert.deepEqual(current.map(p => p.unitId).sort(), unitManifest.map(u => u.id).sort());
  for (const level of ['A1','A2','B1','B2','C1','C2']) {
    assert.equal(current.filter(p => p.payload.level === level).length, 16);
  }
});
test('content provenance cannot be substituted even with a recomputed package checksum', () => {
  const p = changed(p => { p.sourceText += 'invented source'; });
  assert.throws(() => validateCourseSource(p, courses[0].payload.sourceText), /SOURCE_CHECKSUM_CONFLICT/);
});
test('authored imports reject invented review claims and absent listening source', () => {
  const p = changed(p => { p.reviewLog.language = 'APPROVED'; });
  assert.throws(() => validateCourseSource(p, p.sourceText), /UNVERIFIED_REVIEW_CLAIM/);
  const missing = changed(p => { p.inputs.pop(); });
  assert.throws(() => validateCourseSource(missing, missing.sourceText), /INCOMPLETE_CONTENT/);
});
test('answer evidence, source references and identity are validated independently of package hash', () => {
  const key = changed(p => { p.practice[0].acceptedAnswers = ['unsupported answer']; });
  assert.throws(() => validateCourseSource(key, key.sourceText), /ANSWER_SOURCE_CONFLICT/);
  const source = changed(p => { p.practice[12].sourceId = 'UNKNOWN'; });
  assert.throws(() => validateCourseSource(source, source.sourceText), /UNKNOWN_INPUT/);
  const duplicate = changed(p => { p.practice[1].stableId = p.practice[0].stableId; });
  assert.throws(() => validateCourseSource(duplicate, duplicate.sourceText), /DUPLICATE_CONTENT_ID/);
});

test('lexical extraction rejects embedded and inflected matches but finds complete words', () => {
  assert.equal(lexicalIndex('He remembers details.', 'member'), -1);
  assert.equal(lexicalIndex('Go upstairs.', 'stairs'), -1);
  assert.equal(lexicalIndex('a few minutes later', 'late'), -1);
  assert.equal(lexicalIndex('different dimensions', 'dimension'), -1);
  assert.equal(lexicalIndex('He remembers each member.', 'member'), 18);
  assert.equal(lexicalIndex('Say “I’m ready”.', "I'm"), 5);
});
