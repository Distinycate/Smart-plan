import assert from 'node:assert/strict';
import { normalizeActivityGeneration } from '../lib/aiActivityResult';

const complete = normalizeActivityGeneration({
  learningProcess: 'ขั้นนำ ขั้นสอน ขั้นสรุป',
  learningContent: 'แรงและผลของแรงต่อวัตถุ',
  learningMedia: ['ใบกิจกรรม', 'แบบจำลอง'],
  learningSources: '- หนังสือเรียน\n- ห้องปฏิบัติการ',
  tasks: ['รายงานผลการทดลอง'],
}, true);

assert.equal(complete.ok, true);
assert.deepEqual(complete.data.learningSources, ['หนังสือเรียน', 'ห้องปฏิบัติการ']);

const missingResources = normalizeActivityGeneration({
  learningProcess: 'มีข้อมูล',
  learningContent: '',
  learningMedia: [],
  learningSources: ['  '],
  tasks: null,
}, true);

assert.equal(missingResources.ok, false);
assert.deepEqual(missingResources.missing, [
  'learningContent',
  'learningMedia',
  'learningSources',
  'tasks',
]);

const existingProcessMode = normalizeActivityGeneration({
  learningContent: 'เนื้อหา',
  learningMedia: 'ใบงาน',
  learningSources: 'หนังสือเรียน',
  tasks: 'ชิ้นงาน',
}, false);

assert.equal(existingProcessMode.ok, true);
assert.equal(existingProcessMode.data.learningProcess, '');

console.log('aiActivityResult tests passed');
