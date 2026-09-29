/**
 * Smart Plan V3.8V — Document Model Fixtures for Visual Verification
 * 
 * Provides authentic, high-fidelity fixtures for:
 * 1. English Speaking (Main Plan, Speaking Card, Speaking Rubric, Exit Ticket)
 * 2. Math Problem Solving (Problem Set, Thinking workspace, Scoring Guide, Answer Guidance)
 * 3. Science Experiment (Experiment Sheet, Data Table, Observation Checklist)
 * 4. Rubric Stress Test (3-level, 4-level, 5-level matrices with lengthy descriptors)
 * 5. Long Content Stress Test (7 Activity blocks, 20 Worksheet items, 10-row Data Table, 2+ page Teacher Guide)
 */

import type { V3LessonDocument, DocumentOptions } from './types';
import { DEFAULT_DOCUMENT_OPTIONS } from './types';
import { buildLessonDocument } from './builder';
import type { V3LessonGraph } from '../types';

function normalizeGraph(raw: any): V3LessonGraph {
  const now = '2026-09-29T10:00:00Z';
  return {
    lesson: {
      id: raw.lesson.id,
      user_id: raw.lesson.user_id || 'demo-user',
      title: raw.lesson.topic,
      topic: raw.lesson.topic,
      grade_level: raw.lesson.grade_level,
      duration_minutes: raw.lesson.duration_minutes || 60,
      subject_key: raw.lesson.subject_key,
      course_code: raw.lesson.course_code || 'ค101',
      unit_reference: raw.lesson.unit_reference || '',
      teaching_date: raw.lesson.teaching_date || null,
      status: raw.lesson.status || 'REVIEWED',
      learning_focus: raw.lesson.learning_focus || '',
      created_at: raw.lesson.created_at || now,
      updated_at: raw.lesson.updated_at || now,
    } as any,
    curriculumLinks: (raw.curriculumLinks || []).map((cl: any, idx: number) => ({
      ...cl,
      source: cl.source || 'TEACHER',
      position: cl.position ?? idx,
      created_at: cl.created_at || now,
      updated_at: cl.updated_at || now,
    })),
    objectives: (raw.objectives || []).map((o: any, idx: number) => ({
      ...o,
      source: o.source || 'TEACHER',
      position: o.position ?? idx,
      created_at: o.created_at || now,
      updated_at: o.updated_at || now,
    })),
    evidence: (raw.evidence || []).map((e: any, idx: number) => ({
      ...e,
      source: e.source || 'TEACHER',
      position: e.position ?? idx,
      created_at: e.created_at || now,
      updated_at: e.updated_at || now,
    })),
    objectiveEvidenceLinks: (raw.objectiveEvidenceLinks || []).map((link: any) => ({
      ...link,
      created_at: link.created_at || now,
    })),
    activities: (raw.activities || []).map((a: any, idx: number) => ({
      ...a,
      source: a.source || 'TEACHER',
      position: a.position ?? idx,
      created_at: a.created_at || now,
      updated_at: a.updated_at || now,
    })),
    activityObjectiveLinks: (raw.activityObjectiveLinks || []).map((link: any) => ({
      ...link,
      created_at: link.created_at || now,
    })),
    activityEvidenceLinks: (raw.activityEvidenceLinks || []).map((link: any) => ({
      ...link,
      created_at: link.created_at || now,
    })),
    assessments: (raw.assessments || []).map((asm: any) => ({
      ...asm,
      criteria_text: asm.criteria_text || asm.criteria || '',
      source: asm.source || 'TEACHER',
      created_at: asm.created_at || now,
      updated_at: asm.updated_at || now,
    })),
    assessmentEvidenceLinks: (raw.assessmentEvidenceLinks || []).map((link: any) => ({
      ...link,
      created_at: link.created_at || now,
    })),
    assessmentActivityLinks: (raw.assessmentActivityLinks || []).map((link: any) => ({
      ...link,
      created_at: link.created_at || now,
    })),
    assessmentTools: (raw.assessmentTools || []).map((t: any) => ({
      ...t,
      created_at: t.created_at || now,
      updated_at: t.updated_at || now,
    })),
    teachingAssets: (raw.teachingAssets || []).map((ast: any, idx: number) => ({
      ...ast,
      position: ast.position ?? idx,
      needs_review: ast.needs_review || false,
      source: ast.source || 'TEACHER',
      created_at: ast.created_at || now,
      updated_at: ast.updated_at || now,
    })),
    assetObjectiveLinks: (raw.assetObjectiveLinks || []).map((link: any) => ({
      ...link,
      created_at: link.created_at || now,
    })),
    assetActivityLinks: (raw.assetActivityLinks || []).map((link: any) => ({
      ...link,
      created_at: link.created_at || now,
    })),
    assetEvidenceLinks: (raw.assetEvidenceLinks || []).map((link: any) => ({
      ...link,
      created_at: link.created_at || now,
    })),
    postTeaching: raw.postTeaching || null,
    reviews: raw.reviews || [],
  };
}

export function createEnglishSpeakingGraph(): V3LessonGraph {
  return normalizeGraph({
    lesson: {
      id: 'demo-english',
      user_id: 'demo-user',
      topic: 'Ordering Food & Drinks at a Restaurant',
      grade_level: 'ม.1',
      duration_minutes: 60,
      subject_key: 'ENGLISH',
      course_code: 'อ21101',
      unit_reference: 'Unit 3: Delicious Moments',
      teaching_date: '2026-10-15',
      status: 'REVIEWED',
      learning_focus: 'การพูดสื่อสารในชีวิตประจำวันเพื่อสั่งอาหารและเครื่องดื่ม (Speaking & Listening)',
      created_at: '2026-09-29T10:00:00Z',
      updated_at: '2026-09-29T10:00:00Z',
    },
    curriculumLinks: [
      {
        id: 'cl-en-1',
        lesson_plan_id: 'demo-english',
        standard_code: 'ต 1.2',
        standard_label_snapshot: 'มีทักษะการสื่อสารทางภาษาในการแลกเปลี่ยนข้อมูล แสดงความรู้สึกและความคิดเห็นอย่างมีประสิทธิภาพ',
        indicator_code: 'ต 1.2 ม.1/1',
        indicator_label_snapshot: 'สนทนาแลกเปลี่ยนข้อมูลเกี่ยวกับตนเอง กิจกรรม และสถานการณ์ต่างๆ ในชีวิตประจำวัน',
        position: 0,
      },
    ],
    objectives: [
      {
        id: 'obj-en-1',
        lesson_plan_id: 'demo-english',
        statement: 'บอกคำศัพท์ โครงสร้างประโยค และสำนวนภาษาอังกฤษสำหรับการสั่งอาหารและเครื่องดื่มได้ถูกต้อง (K)',
        objective_type: 'K',
        position: 0,
      },
      {
        id: 'obj-en-2',
        lesson_plan_id: 'demo-english',
        statement: 'พูดสนทนาสั่งอาหารในสถานการณ์จำลองร้านอาหารได้อย่างถูกต้อง คล่องแคล่ว และสุภาพตามมารยาทสังคม (P)',
        objective_type: 'P',
        position: 1,
      },
      {
        id: 'obj-en-3',
        lesson_plan_id: 'demo-english',
        statement: 'แสดงความกระตือรือร้นและมีความมั่นใจในการใช้ภาษาอังกฤษสื่อสารกับผู้อื่น (A)',
        objective_type: 'A',
        position: 2,
      },
    ],
    evidence: [
      {
        id: 'evd-en-1',
        lesson_plan_id: 'demo-english',
        evidence_type: 'SPEAKING',
        description: 'การสนทนาบทบาทสมมติ (Role-play) การสั่งอาหารและเครื่องดื่มแบบจับคู่',
        position: 0,
      },
      {
        id: 'evd-en-2',
        lesson_plan_id: 'demo-english',
        evidence_type: 'EXIT_TICKET',
        description: 'บัตรสรุปการเรียนรู้ก่อนออกจากชั้นเรียน (Exit Ticket)',
        position: 1,
      },
    ],
    objectiveEvidenceLinks: [
      { objective_id: 'obj-en-1', evidence_id: 'evd-en-1' },
      { objective_id: 'obj-en-2', evidence_id: 'evd-en-1' },
      { objective_id: 'obj-en-3', evidence_id: 'evd-en-2' },
    ],
    activities: [
      {
        id: 'act-en-1',
        lesson_plan_id: 'demo-english',
        phase: 'ENGAGE',
        minutes: 10,
        title: 'ขั้นนำเข้าสู่บทเรียน (Warm-up & Engage): Menu Exploration',
        teacher_actions: 'ครูเปิดภาพเมนูอาหารและเครื่องดื่มยอดนิยมบนจอ พร้อมตั้งคำถามกระตุ้นความสนใจ เช่น "What would you like to order today?" และทบทวนคำศัพท์สำคัญ',
        student_actions: 'นักเรียนดูภาพเมนูอาหาร ร่วมกันตอบชื่ออาหารที่ชอบ และคาดเดาความหมายของสำนวนการสั่งอาหารจากบริบท',
        feedback_moment: 'ครูชมเชยและออกเสียงคำศัพท์ที่ถูกต้องให้นักเรียนฟังและออกเสียงตาม',
        assessment_moment: 'สังเกตการมีส่วนร่วมและการจำคำศัพท์เดิมของผู้เรียน',
        position: 0,
      },
      {
        id: 'act-en-2',
        lesson_plan_id: 'demo-english',
        phase: 'PRACTICE',
        minutes: 35,
        title: 'ขั้นฝึกปฏิบัติ (Role-Play Simulation): Restaurant Role-Play',
        teacher_actions: 'ครูแจก Speaking Card และอธิบายกติกาการจับคู่สลับบทบาทเป็น Waiter และ Customer เดินสำรวจรอบห้องเพื่อสังเกตการออกเสียงและให้คำแนะนำแบบรายบุคคล',
        student_actions: 'นักเรียนจับคู่ฝึกสนทนาตามบทบาทใน Speaking Card โดยผลัดกันสั่งอาหารและจดรายการอาหาร จากนั้นสลับบทบาทกัน',
        feedback_moment: 'ให้ข้อชี้แนะทันทีด้านการใช้น้ำเสียง ท่าทาง และโครงสร้างประโยค เช่น "I would like..." แทน "I want..."',
        assessment_moment: 'ประเมินทักษะการพูดรายคู่ตามเกณฑ์รูบริกการประเมินการพูด',
        position: 1,
      },
      {
        id: 'act-en-3',
        lesson_plan_id: 'demo-english',
        phase: 'SUMMARIZE',
        minutes: 15,
        title: 'ขั้นสรุปและสะท้อนคิด (Wrap-up & Reflection): Daily Exit Ticket',
        teacher_actions: 'ครูสุ่มเชิญตัวแทนนักเรียน 2 คู่สนทนาจำลองหน้าชั้นเรียน สรุปสำนวนสำคัญ และแจก Exit Ticket ให้นักเรียนทำรายบุคคล',
        student_actions: 'เพื่อนร่วมชั้นสังเกตและปรบมือให้กำลังใจ จากนั้นทุกคนเขียนตอบบัตรสรุปการเรียนรู้ (Exit Ticket) ส่งก่อนออกจากห้อง',
        feedback_moment: 'สรุปภาพรวมจุดเด่นของการใช้ภาษาและประเด็นที่ควรระมัดระวังในชีวิตจริง',
        assessment_moment: 'ตรวจความเข้าใจผ่านคำตอบใน Exit Ticket',
        position: 2,
      },
    ],
    assessments: [
      {
        id: 'asm-en-1',
        lesson_plan_id: 'demo-english',
        name: 'การประเมินทักษะการพูดสนทนาสั่งอาหาร (Speaking Assessment)',
        assessment_type: 'PERFORMANCE',
        method: 'PERFORMANCE_EXAM',
        formative: true,
        criteria: 'ผ่านเกณฑ์ตั้งแต่ระดับดีขึ้นไป (ได้คะแนนรวม 6 คะแนนขึ้นไปจากเต็ม 9 คะแนน)',
      },
      {
        id: 'asm-en-2',
        lesson_plan_id: 'demo-english',
        name: 'การประเมินความรู้และเจตคติผ่าน Exit Ticket',
        assessment_type: 'WRITTEN_TEST',
        method: 'DOCUMENT_ANALYSIS',
        formative: true,
        criteria: 'ตอบคำถามสะท้อนคิดได้ครบถ้วนและถูกต้องตามเกณฑ์อย่างน้อย 2 ใน 3 ข้อ',
      },
    ],
    assessmentEvidenceLinks: [
      { assessment_id: 'asm-en-1', evidence_id: 'evd-en-1' },
      { assessment_id: 'asm-en-2', evidence_id: 'evd-en-2' },
    ],
    assessmentTools: [
      {
        id: 'tool-en-1',
        lesson_plan_id: 'demo-english',
        assessment_id: 'asm-en-1',
        tool_type: 'PERFORMANCE_RUBRIC',
        title: 'แบบประเมินทักษะการพูดสนทนาภาษาอังกฤษ (Speaking Rubric)',
        content: {
          title: 'เกณฑ์การประเมินการพูดสนทนาสั่งอาหารในร้านอาหาร',
          levels: [
            { score: 3, label: 'ดีมาก (3 คะแนน)' },
            { score: 2, label: 'พอใช้ (2 คะแนน)' },
            { score: 1, label: 'ต้องปรับปรุง (1 คะแนน)' },
          ],
          criteria: [
            {
              name: 'ความถูกต้องด้านคำศัพท์และโครงสร้างภาษา (Grammar & Vocabulary)',
              descriptors: {
                '3': 'ใช้คำศัพท์และสำนวนการสั่งอาหาร เช่น "Could I have...", "I would like..." ได้ถูกต้องสมบูรณ์ ไวยากรณ์ถูกต้อง',
                '2': 'ใช้คำศัพท์และสำนวนสื่อสารได้เข้าใจ มีข้อผิดพลาดเล็กน้อยทางไวยากรณ์แต่ไม่กระทบต่อการสื่อความหมาย',
                '1': 'ใช้คำศัพท์ผิดความหมาย โครงสร้างประโยคไม่สมบูรณ์ ทำให้คู่สนทนาเข้าใจยาก',
              },
            },
            {
              name: 'ความคล่องแคล่วและการออกเสียง (Fluency & Pronunciation)',
              descriptors: {
                '3': 'พูดได้อย่างต่อเนื่อง ลื่นไหล ออกเสียงคำและลงเสียงหนักเบา (Stress) ได้ชัดเจนและเป็นธรรมชาติ',
                '2': 'พูดได้ต่อเนื่องเป็นส่วนใหญ่ มีการหยุดคิดหรือทวนคำบ้างเป็นบางครั้ง การออกเสียงชัดเจนพอสมควร',
                '1': 'พูดติดขัด หยุดคิดเป็นเวลานาน ออกเสียงผิดพลาดหลายคำจนทำให้สื่อสารไม่ต่อเนื่อง',
              },
            },
            {
              name: 'การปฏิสัมพันธ์และมารยาทในการสื่อสาร (Interaction & Politeness)',
              descriptors: {
                '3': 'สบตา ยิ้มแย้ม ใช้คำลงท้ายสุภาพ (Please / Thank you) และตอบสนองต่อคู่สนทนาได้อย่างเป็นธรรมชาติ',
                '2': 'มีปฏิสัมพันธ์กับคู่สนทนาพอสมควร มีการใช้คำสุภาพเป็นส่วนใหญ่',
                '1': 'ขาดการสบตา ไม่แสดงปฏิสัมพันธ์ หรือละเลยการใช้คำสุภาพในการสั่งอาหาร',
              },
            },
          ],
        },
      },
    ],
    teachingAssets: [
      {
        id: 'asset-en-1',
        lesson_plan_id: 'demo-english',
        asset_type: 'SPEAKING_CARD',
        title: 'บัตรบทบาทสมมติร้านอาหาร (Restaurant Role-Play Card)',
        audience: 'STUDENT',
        generation_status: 'READY',
        content: {
          title: 'Restaurant Role-Play Simulation Cards',
          instruction: 'ให้นักเรียนจับคู่กัน คนหนึ่งเป็น Customer และอีกคนหนึ่งเป็น Waiter ใช้ข้อมูลในบัตรเพื่อสนทนา จากนั้นสลับบทบาท',
          roleOrCardType: 'STUDENT_A_B',
          cards: [
            {
              cardId: 'card-a',
              assignedTo: 'Student A: Customer (ลูกค้า)',
              roleTitle: 'Customer',
              situation: 'คุณกำลังไปรับประทานอาหารกลางวัน ต้องการสั่งอาหารจานหลัก 1 อย่าง เครื่องดื่ม 1 อย่าง และสอบถามราคาพร้อมขอชำระเงิน',
              cuesOrClues: [
                'Greeting: "Hello / Good afternoon."',
                'Ordering Food: "Could I have the grilled chicken salad, please?"',
                'Ordering Drink: "I would like iced lemon tea, please."',
                'Asking for bill: "Could I get the bill, please? How much is it?"',
              ],
              targetVocabulary: ['grilled chicken', 'iced lemon tea', 'bill', 'delicious'],
            },
            {
              cardId: 'card-b',
              assignedTo: 'Student B: Waiter / Waitress (พนักงานเสิร์ฟ)',
              roleTitle: 'Server',
              situation: 'คุณเป็นพนักงานต้อนรับในร้านอาหาร ทักทายลูกค้าอย่างสุภาพ รับรายการอาหาร แนะนำเมนูพิเศษ และแจ้งยอดชำระเงิน',
              cuesOrClues: [
                'Greeting: "Welcome to Bistro Café. How many persons today?"',
                'Taking order: "Are you ready to order? What would you like to have?"',
                'Confirming: "Certainly! One chicken salad and one iced lemon tea."',
                'Presenting bill: "Here is your bill. That will be 150 Baht, please."',
              ],
              targetVocabulary: ['welcome', 'recommend', 'certainly', 'total', 'have a nice day'],
            },
          ],
        },
      },
      {
        id: 'asset-en-2',
        lesson_plan_id: 'demo-english',
        asset_type: 'EXIT_TICKET',
        title: 'บัตรสรุปการเรียนรู้ก่อนออกจากชั้นเรียน (Exit Ticket)',
        audience: 'STUDENT',
        generation_status: 'READY',
        content: {
          title: 'Daily Exit Ticket: Food & Drink Communication',
          prompts: [
            'เขียนประโยคที่ใช้ในการสั่งเครื่องดื่มอย่างสุภาพ 1 ประโยค',
            'บอกคำศัพท์เกี่ยวกับอาหารหรือรสชาติอาหารที่ได้เรียนรู้ใหม่ในวันนี้ 2 คำ',
            'นักเรียนให้คะแนนความมั่นใจในการพูดภาษาอังกฤษของตนเองในวันนี้กี่คะแนน (เต็ม 5) เพราะเหตุใด?',
          ],
        },
      },
      {
        id: 'asset-en-3',
        lesson_plan_id: 'demo-english',
        asset_type: 'ANSWER_KEY',
        title: 'แนวคำตอบและตัวอย่างบทสนทนา (Sample Dialogue & Guidance)',
        audience: 'TEACHER',
        generation_status: 'READY',
        content: {
          answers: [
            {
              itemNumber: 1,
              targetQuestion: 'แนวทางประโยคสั่งเครื่องดื่มอย่างสุภาพ (Exit Ticket ข้อ 1)',
              correctAnswer: '"Could I have a glass of iced lemon tea, please?" หรือ "I would like an orange juice, please."',
              explanation: 'เน้นการใช้ Could I have... หรือ I would like... และลงท้ายด้วย please เสมอ',
            },
            {
              itemNumber: 2,
              targetQuestion: 'ตัวอย่างบทสนทนาสมบูรณ์สำหรับกิจกรรม Role-Play',
              correctAnswer: 'A: Good afternoon. Could I see the menu, please?\nB: Certainly. Here is the menu. Are you ready to order?\nA: Yes, I would like the pasta and mineral water, please.\nB: Great choice. Anything else?\nA: No, that will be all. Thank you.',
              explanation: 'ใช้เป็นแนวทางในการตรวจสอบความถูกต้องและความสมเหตุสมผลของการสนทนาของนักเรียน',
            },
          ],
        },
      },
    ],
  });
}

export function createMathProblemSolvingGraph(): V3LessonGraph {
  return normalizeGraph({
    lesson: {
      id: 'demo-math',
      user_id: 'demo-user',
      topic: 'การแก้โจทย์ปัญหาร้อยละและการประยุกต์ใช้ในชีวิตจริง',
      grade_level: 'ม.2',
      duration_minutes: 60,
      subject_key: 'MATHEMATICS',
      course_code: 'ค22101',
      unit_reference: 'หน่วยที่ 2: อัตราส่วน สัดส่วน และร้อยละ',
      teaching_date: '2026-10-16',
      status: 'REVIEWED',
      learning_focus: 'กระบวนการแก้โจทย์ปัญหา 4 ขั้นตอนของโพลยา (Polya Problem Solving Process)',
      created_at: '2026-09-29T10:00:00Z',
      updated_at: '2026-09-29T10:00:00Z',
    },
    curriculumLinks: [
      {
        id: 'cl-ma-1',
        lesson_plan_id: 'demo-math',
        standard_code: 'ค 1.1',
        standard_label_snapshot: 'เข้าใจความหลากหลายของการแสดงจำนวน ระบบจำนวน การดำเนินการของจำนวน และผลที่เกิดขึ้น',
        indicator_code: 'ค 1.1 ม.2/1',
        indicator_label_snapshot: 'เข้าใจและประยุกต์ใช้อัตราส่วน สัดส่วน และร้อยละ ในการแก้ปัญหาคณิตศาสตร์และปัญหาในชีวิตจริง',
        position: 0,
      },
    ],
    objectives: [
      {
        id: 'obj-ma-1',
        lesson_plan_id: 'demo-math',
        statement: 'วิเคราะห์สิ่งที่โจทย์กำหนดและสิ่งที่โจทย์ถามในโจทย์ปัญหาร้อยละได้อย่างถูกต้อง (K)',
        objective_type: 'K',
        position: 0,
      },
      {
        id: 'obj-ma-2',
        lesson_plan_id: 'demo-math',
        statement: 'แสดงขั้นตอนการแก้โจทย์ปัญหาร้อยละอย่างเป็นระบบและคำนวณหาคำตอบได้อย่างถูกต้อง (P)',
        objective_type: 'P',
        position: 1,
      },
      {
        id: 'obj-ma-3',
        lesson_plan_id: 'demo-math',
        statement: 'มีความรอบคอบและสามารถตรวจสอบความสมเหตุสมผลของคำตอบได้ (A)',
        objective_type: 'A',
        position: 2,
      },
    ],
    evidence: [
      {
        id: 'evd-ma-1',
        lesson_plan_id: 'demo-math',
        evidence_type: 'PROBLEM_SET',
        description: 'ใบงานแบบฝึกทักษะชุดโจทย์ปัญหาการประยุกต์ร้อยละ พร้อมพื้นที่แสดงวิธีคิดและคำตอบ',
        position: 0,
      },
    ],
    objectiveEvidenceLinks: [
      { objective_id: 'obj-ma-1', evidence_id: 'evd-ma-1' },
      { objective_id: 'obj-ma-2', evidence_id: 'evd-ma-1' },
      { objective_id: 'obj-ma-3', evidence_id: 'evd-ma-1' },
    ],
    activities: [
      {
        id: 'act-ma-1',
        lesson_plan_id: 'demo-math',
        phase: 'ENGAGE',
        minutes: 10,
        title: 'ขั้นนำเข้าสู่บทเรียน: ป้ายลดราคาสินค้ากับเงินในกระเป๋า',
        teacher_actions: 'ครูจำลองสถานการณ์ร้านค้าจัดโปรโมชัน "ลดราคา 25% และลดเพิ่มอีก 10% เมื่อจ่ายด้วยเงินสด" ชวนนักเรียนอภิปรายว่าลดเท่ากับ 35% จริงหรือไม่',
        student_actions: 'นักเรียนร่วมกันวิเคราะห์และแสดงความคิดเห็นจากประสบการณ์จริงในชีวิตประจำวัน',
        feedback_moment: 'ชี้แนะข้อควรระวังเรื่องฐานของร้อยละที่เปลี่ยนไป',
        assessment_moment: 'สังเกตการให้เหตุผลทางคณิตศาสตร์เบื้องต้น',
        position: 0,
      },
      {
        id: 'act-ma-2',
        lesson_plan_id: 'demo-math',
        phase: 'PRACTICE',
        minutes: 35,
        title: 'ขั้นกระบวนการแก้ปัญหา: 4 ขั้นตอนของโพลยา (Think-Pair-Share)',
        teacher_actions: 'แจกชุดโจทย์ปัญหา นำเสนอแนวคิด 4 ขั้นตอน (ทำความเข้าใจ → วางแผน → ลงมือทำ → ตรวจสอบ) และคอยดูแลนักเรียนรายกลุ่ม',
        student_actions: 'นักเรียนลงมือแก้โจทย์ปัญหาทีละข้อ โดยเขียนแสดงวิธีคิดในพื้นที่กำหนด จับคู่แลกเปลี่ยนวิธีคิดกับเพื่อน และตรวจสอบความถูกต้อง',
        feedback_moment: 'เดินให้ข้อเสนอแนะในการเขียนสัดส่วนและการตัดทอนตัวเลข',
        assessment_moment: 'ตรวจร่องรอยการคิดในพื้นที่แสดงวิธีทำตามเกณฑ์ Scoring Guide',
        position: 1,
      },
      {
        id: 'act-ma-3',
        lesson_plan_id: 'demo-math',
        phase: 'SUMMARIZE',
        minutes: 15,
        title: 'ขั้นสรุปและสะท้อนแนวคิด: สรุปหลักคิดและการประยุกต์ใช้',
        teacher_actions: 'สุ่มตัวแทนกลุ่มนำเสนอวิธีคิดที่แตกต่างกันบนกระดาน และสรุปหลักการสำคัญในการแก้โจทย์ปัญหาร้อยละ',
        student_actions: 'นักเรียนร่วมกันตรวจสอบความสมเหตุสมผลของคำตอบ และจดบันทึกประเด็นสำคัญลงในสมุด',
        feedback_moment: 'ชมเชยการแสดงวิธีทำที่ละเอียดและรอบคอบ',
        assessment_moment: 'สรุปผลคะแนนจากใบงานชุดโจทย์ปัญหา',
        position: 2,
      },
    ],
    assessments: [
      {
        id: 'asm-ma-1',
        lesson_plan_id: 'demo-math',
        name: 'การประเมินทักษะการแก้โจทย์ปัญหาคณิตศาสตร์',
        assessment_type: 'WRITTEN_TEST',
        method: 'DOCUMENT_ANALYSIS',
        formative: true,
        criteria: 'ได้คะแนนไม่น้อยกว่าร้อยละ 70 ตามแนวทางการให้คะแนน (Scoring Guide)',
      },
    ],
    assessmentEvidenceLinks: [
      { assessment_id: 'asm-ma-1', evidence_id: 'evd-ma-1' },
    ],
    assessmentTools: [
      {
        id: 'tool-ma-1',
        lesson_plan_id: 'demo-math',
        assessment_id: 'asm-ma-1',
        tool_type: 'SCORING_GUIDE',
        title: 'แนวทางการให้คะแนนการแก้โจทย์ปัญหา (Problem Solving Scoring Guide)',
        content: {
          title: 'เกณฑ์การให้คะแนนกระบวนการแก้โจทย์ปัญหา 4 ขั้นตอน (ข้อละ 5 คะแนน)',
          instruction: 'ใช้สำหรับประเมินร่องรอยการคิดและการแสดงวิธีทำในแต่ละข้อ',
          scales: [
            { score: '1 คะแนน', criteria: 'ขั้นที่ 1 ทำความเข้าใจโจทย์: ระบุสิ่งที่โจทย์กำหนดให้และสิ่งที่โจทย์ต้องการทราบได้อย่างถูกต้องครบถ้วน' },
            { score: '1 คะแนน', criteria: 'ขั้นที่ 2 วางแผนแก้ปัญหา: เขียนความสัมพันธ์ในรูปสัดส่วนหรือสมการทางคณิตศาสตร์ได้ถูกต้องสอดคล้องกับโจทย์' },
            { score: '2 คะแนน', criteria: 'ขั้นที่ 3 ดำเนินการตามแผน: แสดงขั้นตอนการคำนวณทางคณิตศาสตร์ได้อย่างเป็นระบบ ถูกต้อง และชัดเจน' },
            { score: '1 คะแนน', criteria: 'ขั้นที่ 4 ตรวจสอบคำตอบ: สรุปคำตอบพร้อมระบุหน่วยถูกต้อง และมีร่องรอยการตรวจสอบความสมเหตุสมผล' },
          ],
        },
      },
    ],
    teachingAssets: [
      {
        id: 'asset-ma-1',
        lesson_plan_id: 'demo-math',
        asset_type: 'PROBLEM_SET',
        title: 'ชุดโจทย์ปัญหาคณิตศาสตร์: การประยุกต์ร้อยละในชีวิตจริง',
        audience: 'STUDENT',
        generation_status: 'READY',
        content: {
          title: 'แบบฝึกทักษะการแก้โจทย์ปัญหาเรื่องร้อยละและการประยุกต์',
          instruction: 'ให้นักเรียนแสดงวิธีคิดอย่างละเอียดตามกระบวนการแก้ปัญหา 4 ขั้นตอนในพื้นที่ที่กำหนดให้ในแต่ละข้อ',
          sections: [
            {
              title: 'ตอนที่ 1: การคำนวณส่วนลดและราคาสินค้า',
              instruction: 'จงแสดงวิธีทำอย่างละเอียด',
              items: [
                {
                  itemNumber: 1,
                  prompt: 'ร้านค้าติดราคาขายรองเท้าคู่หนึ่งไว้ 1,800 บาท ในช่วงเทศกาลปีใหม่ทางร้านประกาศลดราคา 20% หากมีลูกค้าซื้อรองเท้านี้ ลูกค้าจะต้องจ่ายเงินกี่บาท?',
                  answerSpace: 'พื้นที่แสดงวิธีคิดและคำตอบ:\n- สิ่งที่โจทย์กำหนดให้: ........................................................................................\n- สิ่งที่โจทย์ถาม: ................................................................................................\n- การวางแผนและแสดงวิธีทำ:\n\n\n\n- คำตอบ: ...........................................................................................................',
                },
                {
                  itemNumber: 2,
                  prompt: 'โทรทัศน์เครื่องหนึ่งราคา 15,000 บาท ทางร้านจัดโปรโมชันลดราคาเหลือ 12,000 บาท จงหาว่าร้านค้าลดราคากี่เปอร์เซ็นต์?',
                  answerSpace: 'พื้นที่แสดงวิธีคิดและคำตอบ:\n- สิ่งที่โจทย์กำหนดให้: ........................................................................................\n- การเขียนสัดส่วนหรือสมการ:\n\n\n- การคำนวณและสรุปคำตอบ: .................................................................................',
                },
              ],
            },
          ],
        },
      },
      {
        id: 'asset-ma-2',
        lesson_plan_id: 'demo-math',
        asset_type: 'ANSWER_KEY',
        title: 'แนวคำตอบและขั้นตอนการคิดละเอียด (Step-by-Step Answer Guidance)',
        audience: 'TEACHER',
        generation_status: 'READY',
        content: {
          answers: [
            {
              itemNumber: 1,
              targetQuestion: 'ข้อ 1: รองเท้าติดป้าย 1,800 บาท ลดราคา 20%',
              correctAnswer: 'ลูกค้าต้องจ่ายเงิน 1,440 บาท',
              explanation: 'วิธีทำ:\n1) จำนวนเงินส่วนลด = (20/100) × 1,800 = 360 บาท\n2) ราคาที่ต้องจ่ายจริง = 1,800 - 360 = 1,440 บาท\n(หรือคิดจาก 80% ของ 1,800 = 0.80 × 1,800 = 1,440 บาท)\nตรวจสอบ: 1,440 บาท คิดเป็น 80% ของราคาป้าย ถูกต้องและสมเหตุสมผล',
            },
            {
              itemNumber: 2,
              targetQuestion: 'ข้อ 2: โทรทัศน์ 15,000 บาท ลดเหลือ 12,000 บาท ลดกี่เปอร์เซ็นต์',
              correctAnswer: 'ร้านค้าลดราคา 20%',
              explanation: 'วิธีทำ:\n1) จำนวนเงินส่วนลด = 15,000 - 12,000 = 3,000 บาท\n2) คิดเป็นเปอร์เซ็นต์ส่วนลด = (3,000 / 15,000) × 100% = 20%\nตรวจสอบ: 20% ของ 15,000 คือ 3,000 บาท ราคาขาย 15,000 - 3,000 = 12,000 บาท ถูกต้อง',
            },
          ],
        },
      },
    ],
  });
}

export function createScienceExperimentGraph(): V3LessonGraph {
  return normalizeGraph({
    lesson: {
      id: 'demo-science',
      user_id: 'demo-user',
      topic: 'การแพร่และออสโมซิสของเซลล์พืชในสารละลายความเข้มข้นต่างกัน',
      grade_level: 'ม.1',
      duration_minutes: 60,
      subject_key: 'SCIENCE',
      course_code: 'ว21101',
      unit_reference: 'หน่วยที่ 1: เซลล์และการดำรงชีวิตของพืช',
      teaching_date: '2026-10-17',
      status: 'REVIEWED',
      learning_focus: 'การทดลองทางวิทยาศาสตร์และทักษะกระบวนการสังเกตการเปลี่ยนแปลงของเซลล์ (Inquiry-based)',
      created_at: '2026-09-29T10:00:00Z',
      updated_at: '2026-09-29T10:00:00Z',
    },
    curriculumLinks: [
      {
        id: 'cl-sc-1',
        lesson_plan_id: 'demo-science',
        standard_code: 'ว 1.2',
        standard_label_snapshot: 'เข้าใจสมบัติของสิ่งมีชีวิต หน่วยพื้นฐานของสิ่งมีชีวิต การลำเลียงสารเข้าและออกจากเซลล์',
        indicator_code: 'ว 1.2 ม.1/2',
        indicator_label_snapshot: 'อธิบายการแพร่และออสโมซิสจากหลักฐานเชิงประจักษ์ และยกตัวอย่างการแพร่และออสโมซิสในชีวิตประจำวัน',
        position: 0,
      },
    ],
    objectives: [
      {
        id: 'obj-sc-1',
        lesson_plan_id: 'demo-science',
        statement: 'อธิบายหลักการเคลื่อนที่ของโมเลกุลน้ำผ่านเยื่อเลือกผ่านในการเกิดออสโมซิสได้ (K)',
        objective_type: 'K',
        position: 0,
      },
      {
        id: 'obj-sc-2',
        lesson_plan_id: 'demo-science',
        statement: 'ทำการทดลอง บันทึกข้อมูลมวลและความยาวของชิ้นมันฝรั่งลงในตารางได้อย่างถูกต้องและเป็นระบบ (P)',
        objective_type: 'P',
        position: 1,
      },
      {
        id: 'obj-sc-3',
        lesson_plan_id: 'demo-science',
        statement: 'ปฏิบัติตามกฎความปลอดภัยในห้องปฏิบัติการและทำงานร่วมกับเพื่อนในกลุ่มด้วยความรับผิดชอบ (A)',
        objective_type: 'A',
        position: 2,
      },
    ],
    evidence: [
      {
        id: 'evd-sc-1',
        lesson_plan_id: 'demo-science',
        evidence_type: 'EXPERIMENT_SHEET',
        description: 'ใบรายงานผลการทดลองพร้อมตารางบันทึกผลการทดลองการเปลี่ยนแปลงมวลของชิ้นมันฝรั่ง',
        position: 0,
      },
    ],
    objectiveEvidenceLinks: [
      { objective_id: 'obj-sc-1', evidence_id: 'evd-sc-1' },
      { objective_id: 'obj-sc-2', evidence_id: 'evd-sc-1' },
      { objective_id: 'obj-sc-3', evidence_id: 'evd-sc-1' },
    ],
    activities: [
      {
        id: 'act-sc-1',
        lesson_plan_id: 'demo-science',
        phase: 'ENGAGE',
        minutes: 10,
        title: 'ขั้นสร้างความสนใจ (Engagement): ผักเหี่ยวกลับมาสดได้อย่างไร?',
        teacher_actions: 'ครูนำต้นผักกาดที่เหี่ยวกับต้นผักกาดที่แช่น้ำจนเต่งมาให้นักเรียนเปรียบเทียบ ตั้งประเด็นท้าทายความคิดว่าเกิดอะไรขึ้นกับเซลล์',
        student_actions: 'นักเรียนสังเกต สัมผัสความแตกต่างของผักทั้งสองต้น และตั้งข้อสันนิษฐานเกี่ยวกับการเคลื่อนที่ของน้ำ',
        feedback_moment: 'เชื่อมโยงความคิดเห็นของนักเรียนเข้าสู่สมมติฐานทางวิทยาศาสตร์',
        assessment_moment: 'สังเกตการตั้งคำถามและการเชื่อมโยงความรู้เดิม',
        position: 0,
      },
      {
        id: 'act-sc-2',
        lesson_plan_id: 'demo-science',
        phase: 'EXPLORE',
        minutes: 30,
        title: 'ขั้นสำรวจและค้นหา (Exploration): การทดลองออสโมซิสในชิ้นมันฝรั่ง',
        teacher_actions: 'ชี้แจงขั้นตอนความปลอดภัย แจกอุปกรณ์และสารละลายน้ำตาลความเข้มข้นต่างกัน (0%, 5%, 10%, 20%) ดูแลการใช้มีดตัดแท่งมันฝรั่งและการชั่งน้ำหนัก',
        student_actions: 'นักเรียนแบ่งกลุ่มตัดชิ้นมันฝรั่งให้มีขนาดเท่ากัน ชั่งมวลเริ่มต้น บันทึกลงตาราง นำไปแช่ในสารละลายทั้ง 4 ชนิด และจับเวลา 20 นาที',
        feedback_moment: 'ตรวจความถูกต้องของการใช้เครื่องชั่งดิจิทัลและการซับน้ำก่อนชั่ง',
        assessment_moment: 'ประเมินทักษะการปฏิบัติการทดลองตามแบบสังเกตพฤติกรรม (Checklist)',
        position: 1,
      },
      {
        id: 'act-sc-3',
        lesson_plan_id: 'demo-science',
        phase: 'EXPLAIN',
        minutes: 10,
        title: 'ขั้นอธิบายและลงข้อสรุป (Explanation): วิเคราะห์ข้อมูลจากตาราง',
        teacher_actions: 'ให้นักเรียนนำชิ้นมันฝรั่งขึ้นมาซับให้แห้ง ชั่งมวลหลังการแช่ คำนวณร้อยละการเปลี่ยนแปลงมวล และนำข้อมูลขึ้นกระดานเปรียบเทียบกัน',
        student_actions: 'นักเรียนบันทึกข้อมูลมวลหลังแช่ คำนวณผลต่าง และอภิปรายความสัมพันธ์ระหว่างความเข้มข้นของสารละลายกับมวลของมันฝรั่ง',
        feedback_moment: 'ชี้แนะหลักการเคลื่อนที่ของน้ำจากสารละลายเจือจางไปยังสารละลายเข้มข้น',
        assessment_moment: 'ตรวจความสมบูรณ์ของตารางบันทึกผล',
        position: 2,
      },
      {
        id: 'act-sc-4',
        lesson_plan_id: 'demo-science',
        phase: 'ELABORATE',
        minutes: 10,
        title: 'ขั้นขยายความรู้และสรุป (Elaboration & Evaluation): การประยุกต์ในชีวิตประจำวัน',
        teacher_actions: 'ชวนนักเรียนยกตัวอย่างปรากฏการณ์ออสโมซิสในชีวิตจริง เช่น การทำไข่เค็ม การดองผักผลไม้ และสรุปแนวคิดหลักร่วมกัน',
        student_actions: 'นักเรียนร่วมกันสรุปหลักการออสโมซิส ตอบคำถามประยุกต์ลงในใบงาน และช่วยกันทำความสะอาดอุปกรณ์',
        feedback_moment: 'สรุปประเด็นหลักและชื่นชมความร่วมมือของทุกกลุ่ม',
        assessment_moment: 'ประเมินผลสัมฤทธิ์จากใบรายงานผลการทดลอง',
        position: 3,
      },
    ],
    assessments: [
      {
        id: 'asm-sc-1',
        lesson_plan_id: 'demo-science',
        name: 'การประเมินทักษะกระบวนการทางวิทยาศาสตร์ในการปฏิบัติการทดลอง',
        assessment_type: 'PRACTICAL_EXAM',
        method: 'OBSERVATION',
        formative: true,
        criteria: 'ผ่านเกณฑ์ระดับดี (ได้ผลการประเมิน "ปฏิบัติได้ถูกต้อง" อย่างน้อย 4 ใน 5 รายการ)',
      },
    ],
    assessmentEvidenceLinks: [
      { assessment_id: 'asm-sc-1', evidence_id: 'evd-sc-1' },
    ],
    assessmentTools: [
      {
        id: 'tool-sc-1',
        lesson_plan_id: 'demo-science',
        assessment_id: 'asm-sc-1',
        tool_type: 'CHECKLIST',
        title: 'แบบสังเกตทักษะกระบวนการทางวิทยาศาสตร์ (Observation Checklist)',
        content: {
          title: 'รายการประเมินพฤติกรรมการปฏิบัติการทดลองเรื่องออสโมซิส',
          items: [
            { text: '1. การใช้อุปกรณ์เครื่องชั่งและกระบอกตวงสารได้อย่างถูกต้องและระมัดระวัง' },
            { text: '2. การตัดและควบคุมขนาดของชิ้นมันฝรั่งให้เท่ากันอย่างประณีต' },
            { text: '3. การซับน้ำส่วนเกินออกจากชิ้นมันฝรั่งอย่างถูกต้องก่อนนำไปชั่งน้ำหนัก' },
            { text: '4. การบันทึกข้อมูลตัวเลขลงในตารางบันทึกผลอย่างละเอียดตามความเป็นจริง' },
            { text: '5. การดูแลความสะอาด จัดเก็บสารเคมีและทำความสะอาดอุปกรณ์หลังเสร็จสิ้นการทดลอง' },
          ],
        },
      },
    ],
    teachingAssets: [
      {
        id: 'asset-sc-1',
        lesson_plan_id: 'demo-science',
        asset_type: 'EXPERIMENT_SHEET',
        title: 'ใบกิจกรรมการทดลอง: การศึกษาปรากฏการณ์ออสโมซิสในเซลล์พืช',
        audience: 'STUDENT',
        generation_status: 'READY',
        content: {
          title: 'ใบปฏิบัติการทดลอง: ออสโมซิสของเซลล์มันฝรั่งในสารละลายน้ำตาล',
          instruction: 'ให้นักเรียนปฏิบัติตามขั้นตอนการทดลอง บันทึกผลการทดลองลงในตาราง และสรุปผลการทดลองร่วมกันในกลุ่ม',
          materials: [
            'หัวมันฝรั่งสด 1 หัว',
            'ที่เจาะเนื้อเยื่อพืชทรงกระบอก (Cork borer) และมีดพลาสติก',
            'สารละลายซูโครสความเข้มข้น 0% (น้ำกลั่น), 5%, 10% และ 20%',
            'บีกเกอร์ขนาด 100 ml จำนวน 4 ใบ',
            'เครื่องชั่งดิจิทัลความละเอียด 2 ตำแหน่ง และกระดาษซับ',
          ],
          steps: [
            '1. ใช้ที่เจาะเนื้อเยื่อพืชเจาะมันฝรั่งให้ได้แท่งทรงกระบอกจำนวน 4 ชิ้น ตัดให้มีความยาวชิ้นละ 3 เซนติเมตร',
            '2. ซับแท่งมันฝรั่งเบาๆ ด้วยกระดาษซับ แล้วนำไปชั่งมวลเริ่มต้น บันทึกผลลงในตาราง',
            '3. เทสารละลายซูโครสความเข้มข้น 0%, 5%, 10% และ 20% ลงในบีกเกอร์ใบที่ 1 ถึง 4 ใบละ 50 ml ตามลำดับ',
            '4. ใส่แท่งมันฝรั่งลงในบีกเกอร์แต่ละใบพร้อมกัน จับเวลา 20 นาที',
            '5. เมื่อครบเวลา นำแท่งมันฝรั่งขึ้นมาซับให้แห้ง นำไปชั่งมวลสุดท้าย และคำนวณร้อยละการเปลี่ยนแปลงมวล',
          ],
          dataTable: {
            title: 'ตารางบันทึกผลการทดลอง: การเปลี่ยนแปลงมวลของชิ้นมันฝรั่ง',
            columns: [
              'ความเข้มข้นสารละลาย (%)',
              'มวลเริ่มต้น (g)',
              'มวลสุดท้าย (g)',
              'ผลต่างมวล (g)',
              'การเปลี่ยนแปลงลักษณะทางกายภาพ',
            ],
            initialRows: [
              ['0% (น้ำกลั่น)', '2.45', '2.68', '+0.23', 'มันฝรั่งแข็งและเต่งขึ้น'],
              ['5%', '2.48', '2.52', '+0.04', 'มันฝรั่งมีสภาพใกล้เคียงเดิม'],
              ['10%', '2.46', '2.31', '-0.15', 'มันฝรั่งเริ่มนิ่มลงเล็กน้อย'],
              ['20%', '2.47', '2.18', '-0.29', 'มันฝรั่งเหี่ยวนิ่มและโค้งงอได้ง่าย'],
            ],
          },
          evidenceSummaryPrompt: 'สรุปผลการทดลอง: ออสโมซิสคือการเคลื่อนที่ของน้ำจากบริเวณที่มีน้ำมากไปน้ำน้อย ทำให้มันฝรั่งในน้ำกลั่นมวลเพิ่มขึ้น แต่มันฝรั่งในสารละลายเข้มข้น 20% สูญเสียน้ำจนมวลลดลงและนิ่มลงอย่างเห็นได้ชัด',
        },
      },
    ],
  });
}

export function createRubricStressGraph(): V3LessonGraph {
  return normalizeGraph({
    lesson: {
      id: 'demo-rubric-stress',
      user_id: 'demo-user',
      topic: 'การนำเสนอโครงงานและการสื่อสารเชิงวิชาการ (Rubric Stress Test)',
      grade_level: 'ม.3',
      duration_minutes: 60,
      subject_key: 'THAI',
      course_code: 'ท23101',
      unit_reference: 'หน่วยการเรียนรู้: การสื่อสารและการนำเสนออย่างมืออาชีพ',
      teaching_date: '2026-10-18',
      status: 'REVIEWED',
      learning_focus: 'การทดสอบการจัดหน้าเกณฑ์รูบริก 3 ระดับ, 4 ระดับ และ 5 ระดับที่มีคำอธิบายละเอียด',
      created_at: '2026-09-29T10:00:00Z',
      updated_at: '2026-09-29T10:00:00Z',
    },
    curriculumLinks: [
      {
        id: 'cl-rs-1',
        lesson_plan_id: 'demo-rubric-stress',
        standard_code: 'ท 3.1',
        standard_label_snapshot: 'สามารถเลือกฟังและดูอย่างมีวิจารณญาณ และพูดแสดงความรู้ ความคิด ในโอกาสต่างๆ อย่างมีวิจารณญาณและสร้างสรรค์',
        indicator_code: 'ท 3.1 ม.3/1',
        indicator_label_snapshot: 'แสดงความคิดเห็นและประเมินเรื่องจากการฟังและการดูเพื่อนำไปประยุกต์ใช้ในการดำเนินชีวิต',
        position: 0,
      },
    ],
    objectives: [
      {
        id: 'obj-rs-1',
        lesson_plan_id: 'demo-rubric-stress',
        statement: 'นำเสนอโครงงานด้วยภาษาทางวิชาการและลำดับความคิดได้อย่างชัดเจน (P)',
        objective_type: 'P',
        position: 0,
      },
    ],
    evidence: [
      {
        id: 'evd-rs-1',
        lesson_plan_id: 'demo-rubric-stress',
        evidence_type: 'PRESENTATION',
        description: 'การนำเสนอโครงงานกลุ่มหน้าชั้นเรียน',
        position: 0,
      },
    ],
    objectiveEvidenceLinks: [
      { objective_id: 'obj-rs-1', evidence_id: 'evd-rs-1' },
    ],
    activities: [
      {
        id: 'act-rs-1',
        lesson_plan_id: 'demo-rubric-stress',
        phase: 'PRACTICE',
        minutes: 60,
        title: 'กิจกรรมการนำเสนอผลงานและการประเมินตามสภาพจริง',
        teacher_actions: 'ครูทำหน้าที่ผู้ประเมินและให้ข้อเสนอแนะสะท้อนกลับแก่นักเรียนแต่ละกลุ่ม',
        student_actions: 'นักเรียนแต่ละกลุ่มผลัดกันนำเสนอโครงงานและประเมินผลงานของเพื่อนร่วมชั้น',
        feedback_moment: 'สะท้อนคิดหลังจบการนำเสนอของแต่ละกลุ่ม',
        assessment_moment: 'ประเมินโดยใช้ Rubric หลากระดับ',
        position: 0,
      },
    ],
    assessments: [
      {
        id: 'asm-rs-1',
        lesson_plan_id: 'demo-rubric-stress',
        name: 'การประเมินการนำเสนอโครงงานเชิงวิชาการ',
        assessment_type: 'PERFORMANCE',
        method: 'PERFORMANCE_EXAM',
        formative: true,
        criteria: 'ผ่านเกณฑ์ระดับดีขึ้นไปตาม Rubric',
      },
    ],
    assessmentEvidenceLinks: [
      { assessment_id: 'asm-rs-1', evidence_id: 'evd-rs-1' },
    ],
    assessmentTools: [
      {
        id: 'tool-rs-1',
        lesson_plan_id: 'demo-rubric-stress',
        assessment_id: 'asm-rs-1',
        tool_type: 'PERFORMANCE_RUBRIC',
        title: 'เกณฑ์การประเมิน 3 ระดับ (3-Level Rubric): การจัดลำดับความคิด',
        content: {
          title: 'Rubric 3 ระดับ: การจัดลำดับเนื้อหาและการนำเสนอ',
          levels: [
            { score: 3, label: 'ดีมาก' },
            { score: 2, label: 'พอใช้' },
            { score: 1, label: 'ปรับปรุง' },
          ],
          criteria: [
            {
              name: 'การจัดลำดับเนื้อหาและความต่อเนื่อง',
              descriptors: {
                '3': 'เนื้อหามีการเรียงลำดับอย่างเป็นเหตุเป็นผล บทนำ ตัวเรื่อง และบทสรุปมีความเชื่อมโยงกันอย่างกลมกลืน ผู้ฟังเข้าใจง่ายและคล้อยตาม',
                '2': 'เนื้อหามีการจัดลำดับตามโครงร่างที่ดีเป็นส่วนใหญ่ อาจมีจุดเชื่อมโยงที่กระโดดข้ามไปบ้างแต่ไม่ทำให้ใจความหลักเสียหาย',
                '1': 'เนื้อหาสับสน วกวน ขาดการจัดหมวดหมู่ที่ชัดเจน ผู้ฟังติดตามประเด็นได้ยาก',
              },
            },
          ],
        },
      },
      {
        id: 'tool-rs-2',
        lesson_plan_id: 'demo-rubric-stress',
        assessment_id: 'asm-rs-1',
        tool_type: 'PERFORMANCE_RUBRIC',
        title: 'เกณฑ์การประเมิน 4 ระดับ (4-Level Rubric): ทักษะการสื่อสารทางวาจา',
        content: {
          title: 'Rubric 4 ระดับ: การใช้น้ำเสียง ท่าทาง และการสื่อความหมาย',
          levels: [
            { score: 4, label: 'ดีเยี่ยม (4)' },
            { score: 3, label: 'ดี (3)' },
            { score: 2, label: 'พอใช้ (2)' },
            { score: 1, label: 'ปรับปรุง (1)' },
          ],
          criteria: [
            {
              name: 'การใช้ภาษา น้ำเสียง และบุคลิกภาพในการนำเสนอ',
              descriptors: {
                '4': 'ใช้น้ำเสียงชัดเจน มีจังหวะจะโคนหนักเบาน่าฟัง สบตากับผู้ฟังอย่างทั่วถึง ยืนตัวตรงอย่างมั่นใจ และใช้ภาษากายประกอบการพูดได้อย่างสง่างาม',
                '3': 'ใช้น้ำเสียงดังฟังชัดพอสมควร สบตากับผู้ฟังเป็นส่วนใหญ่ มีบุคลิกภาพที่ดีและมีความมั่นใจในการพูด',
                '2': 'น้ำเสียงค่อนข้างเบาหรือราบเรียบเกินไป มีการก้มอ่านสคริปต์เป็นระยะ สบตากับผู้ฟังน้อย',
                '1': 'พูดเสียงเบาจนผู้ฟังแทบไม่ได้ยิน ก้มอ่านรายงานตลอดเวลา ไม่สบตาผู้ฟัง และแสดงอาการประหม่าอย่างเห็นได้ชัด',
              },
            },
          ],
        },
      },
      {
        id: 'tool-rs-3',
        lesson_plan_id: 'demo-rubric-stress',
        assessment_id: 'asm-rs-1',
        tool_type: 'PERFORMANCE_RUBRIC',
        title: 'เกณฑ์การประเมิน 5 ระดับ (5-Level Rubric): การตอบคำถามและการแก้ปัญหาเฉพาะหน้า',
        content: {
          title: 'Rubric 5 ระดับแบบยาว (Stress Test Matrix 5 Levels with Detailed Descriptors)',
          levels: [
            { score: 5, label: 'ยอดเยี่ยม (5)' },
            { score: 4, label: 'ดีมาก (4)' },
            { score: 3, label: 'ปานกลาง (3)' },
            { score: 2, label: 'พอใช้ (2)' },
            { score: 1, label: 'ปรับปรุง (1)' },
          ],
          criteria: [
            {
              name: 'การตอบข้อซักถามและการอ้างอิงหลักฐานทางวิชาการเพื่อสนับสนุนข้อสรุป',
              descriptors: {
                '5': 'ตอบคำถามได้อย่างตรงประเด็น ลึกซึ้ง และรอบด้าน สามารถยกตัวอย่างหลักฐานเชิงประจักษ์และการวิเคราะห์ทางสถิติมาสนับสนุนคำตอบได้อย่างน่าเชื่อถือ รับฟังข้อคิดเห็นต่างอย่างเปิดกว้างและมีวุฒิภาวะทางอารมณ์สูง',
                '4': 'ตอบคำถามได้ตรงประเด็นและมีความชัดเจน สามารถอ้างอิงหลักฐานหรือแหล่งข้อมูลที่น่าเชื่อถือมาประกอบคำตอบได้เป็นอย่างดี แสดงความกระตือรือร้นในการแลกเปลี่ยนความคิดเห็นกับผู้ฟัง',
                '3': 'ตอบคำถามได้ในประเด็นพื้นฐาน มีการอธิบายเหตุผลพอสมควร แต่อาจขาดการยกหลักฐานสนับสนุนที่หนักแน่นหรือยังไม่ครอบคลุมคำถามที่ซับซ้อน',
                '2': 'ตอบคำถามไม่ตรงประเด็นบางส่วน หรือตอบอย่างคลุมเครือ ต้องอาศัยการชี้แนะหรือการซักถามย้ำจากครูผู้สอนจึงจะสามารถสรุปใจความได้',
                '1': 'ไม่สามารถตอบคำถามได้ หรือปฏิเสธการตอบข้อซักถาม ขาดหลักฐานและข้อมูลสนับสนุนโดยสิ้นเชิง',
              },
            },
          ],
        },
      },
    ],
    teachingAssets: [],
  });
}

export function createLongContentGraph(): V3LessonGraph {
  return normalizeGraph({
    lesson: {
      id: 'demo-long-content',
      user_id: 'demo-user',
      topic: 'การสังเคราะห์และประยุกต์ความรู้แบบบูรณาการ (Long Content Stress Test)',
      grade_level: 'ม.2',
      duration_minutes: 60,
      subject_key: 'SCIENCE',
      course_code: 'ว22101',
      unit_reference: 'หน่วยบูรณาการพิเศษ: 7 กิจกรรมและแบบฝึกหัดขนาดยาว',
      teaching_date: '2026-10-19',
      status: 'REVIEWED',
      learning_focus: 'การทดสอบสมรรถนะการจัดหน้าเอกสารขนาดยาวที่มี 7 บล็อกกิจกรรม ใบงาน 20 ข้อ ตาราง 10 แถว และคู่มือครู 2 หน้า',
      created_at: '2026-09-29T10:00:00Z',
      updated_at: '2026-09-29T10:00:00Z',
    },
    curriculumLinks: [
      {
        id: 'cl-lc-1',
        lesson_plan_id: 'demo-long-content',
        standard_code: 'ว 2.1',
        standard_label_snapshot: 'เข้าใจสมบัติของสสาร องค์ประกอบของสสาร ความสัมพันธ์ระหว่างสมบัติของสสารกับโครงสร้างและแรงยึดเหนี่ยวระหว่างอนุภาค',
        indicator_code: 'ว 2.1 ม.2/1',
        indicator_label_snapshot: 'อธิบายการแยกสารผสมโดยการระเหยแห้ง การตกผลึก การกลั่นอย่างง่าย โครมาโทกราฟีแบบกระดาษ การสกัดด้วยตัวทำละลาย โดยใช้หลักฐานเชิงประจักษ์',
        position: 0,
      },
    ],
    objectives: [
      {
        id: 'obj-lc-1',
        lesson_plan_id: 'demo-long-content',
        statement: 'ระบุและอธิบายหลักการแยกสารผสมด้วยวิธีต่างๆ ได้อย่างถูกต้องครบถ้วน (K)',
        objective_type: 'K',
        position: 0,
      },
      {
        id: 'obj-lc-2',
        lesson_plan_id: 'demo-long-content',
        statement: 'วิเคราะห์และเลือกวิธีการแยกสารที่เหมาะสมกับสถานการณ์ปัญหาที่กำหนดให้ได้ (P)',
        objective_type: 'P',
        position: 1,
      },
    ],
    evidence: [
      {
        id: 'evd-lc-1',
        lesson_plan_id: 'demo-long-content',
        evidence_type: 'WORKSHEET',
        description: 'ใบงานแบบฝึกทักษะการแยกสารผสม จำนวน 20 ข้อ พร้อมตารางข้อมูลขนาดใหญ่',
        position: 0,
      },
    ],
    objectiveEvidenceLinks: [
      { objective_id: 'obj-lc-1', evidence_id: 'evd-lc-1' },
      { objective_id: 'obj-lc-2', evidence_id: 'evd-lc-1' },
    ],
    activities: [
      {
        id: 'act-lc-1',
        lesson_plan_id: 'demo-long-content',
        phase: 'ENGAGE',
        minutes: 5,
        title: 'กิจกรรมที่ 1: ภาพปริศนาสารผสมในชีวิตประจำวัน',
        teacher_actions: 'แสดงภาพน้ำทะเล น้ำโคลน และน้ำเชื่อม ชวนอภิปราย',
        student_actions: 'นักเรียนตอบคำถามและจำแนกสารผสมเบื้องต้น',
        feedback_moment: 'ชื่นชมการเชื่อมโยงความรู้เดิม',
        assessment_moment: 'ประเมินความสนใจ',
        position: 0,
      },
      {
        id: 'act-lc-2',
        lesson_plan_id: 'demo-long-content',
        phase: 'ENGAGE',
        minutes: 10,
        title: 'กิจกรรมที่ 2: ทบทวนสมบัติทางกายภาพของสาร',
        teacher_actions: 'ทบทวนจุดเดือด จุดหลอมเหลว และการละลาย',
        student_actions: 'จดบันทึกและทบทวนความแตกต่างของสมบัติสาร',
        feedback_moment: 'อธิบายเพิ่มเติมในจุดที่สงสัย',
        assessment_moment: 'ถาม-ตอบ',
        position: 1,
      },
      {
        id: 'act-lc-3',
        lesson_plan_id: 'demo-long-content',
        phase: 'EXPLORE',
        minutes: 15,
        title: 'กิจกรรมที่ 3: สถานีปฏิบัติการที่ 1 การระเหยแห้งและการตกผลึก',
        teacher_actions: 'สาธิตและสังเกตการปฏิบัติการของนักเรียน',
        student_actions: 'นักเรียนบันทึกผลการทดลองลงในตารางข้อมูล',
        feedback_moment: 'ดูแลความปลอดภัยการใช้ตะเกียงแอลกอฮอล์',
        assessment_moment: 'สังเกตทักษะปฏิบัติ',
        position: 2,
      },
      {
        id: 'act-lc-4',
        lesson_plan_id: 'demo-long-content',
        phase: 'EXPLORE',
        minutes: 15,
        title: 'กิจกรรมที่ 4: สถานีปฏิบัติการที่ 2 โครมาโทกราฟีและการสกัดด้วยตัวทำละลาย',
        teacher_actions: 'อธิบายเทคนิคการหยดสีและการดูแถบสี',
        student_actions: 'แยกสารสีในใบไม้และคำนวณค่า Rf',
        feedback_moment: 'ตรวจความประณีตของการวัดระยะทางแถบสี',
        assessment_moment: 'ตรวจใบงาน',
        position: 3,
      },
      {
        id: 'act-lc-5',
        lesson_plan_id: 'demo-long-content',
        phase: 'EXPLAIN',
        minutes: 5,
        title: 'กิจกรรมที่ 5: การสรุปและเปรียบเทียบข้อดี-ข้อจำกัดของแต่ละวิธี',
        teacher_actions: 'สรุปตารางเปรียบเทียบบนจอ',
        student_actions: 'ร่วมกันสรุปข้อค้นพบ',
        feedback_moment: 'เน้นย้ำความแตกต่างของการกลั่นกับการระเหยแห้ง',
        assessment_moment: 'ซักถามความเข้าใจ',
        position: 4,
      },
      {
        id: 'act-lc-6',
        lesson_plan_id: 'demo-long-content',
        phase: 'ELABORATE',
        minutes: 5,
        title: 'กิจกรรมที่ 6: การแก้ปัญหาโจทย์ประยุกต์การแยกสารในอุตสาหกรรม',
        teacher_actions: 'ยกตัวอย่างการกลั่นน้ำมันดิบและการสกัดน้ำมันหอมระเหย',
        student_actions: 'วิเคราะห์แผนผังอุตสาหกรรม',
        feedback_moment: 'แนะนำแหล่งข้อมูลศึกษาต่อยอด',
        assessment_moment: 'สังเกตการวิเคราะห์',
        position: 5,
      },
      {
        id: 'act-lc-7',
        lesson_plan_id: 'demo-long-content',
        phase: 'SUMMARIZE',
        minutes: 5,
        title: 'กิจกรรมที่ 7: การประเมินตนเองและการส่งแบบฝึกทักษะ',
        teacher_actions: 'รวบรวมใบงานและมอบหมายภารกิจทบทวน',
        student_actions: 'ส่งแบบฝึกทักษะและทำความสะอาดพื้นที่การเรียนรู้',
        feedback_moment: 'กล่าวขอบคุณและให้กำลังใจ',
        assessment_moment: 'ตรวจความเรียบร้อย',
        position: 6,
      },
    ],
    assessments: [
      {
        id: 'asm-lc-1',
        lesson_plan_id: 'demo-long-content',
        name: 'การประเมินความรู้และทักษะการแยกสารผสม',
        assessment_type: 'WRITTEN_TEST',
        method: 'DOCUMENT_ANALYSIS',
        formative: true,
        criteria: 'ทำแบบฝึกทักษะ 20 ข้อ ถูกต้องไม่น้อยกว่าร้อยละ 75',
      },
    ],
    assessmentEvidenceLinks: [
      { assessment_id: 'asm-lc-1', evidence_id: 'evd-lc-1' },
    ],
    assessmentTools: [],
    teachingAssets: [
      {
        id: 'asset-lc-1',
        lesson_plan_id: 'demo-long-content',
        asset_type: 'WORKSHEET',
        title: 'ใบงานแบบฝึกทักษะขนาดยาว (20 Items Worksheet): การแยกสารผสม',
        audience: 'STUDENT',
        generation_status: 'READY',
        content: {
          title: 'แบบฝึกทักษะการแยกสารผสมในชีวิตประจำวันและอุตสาหกรรม (20 ข้อ)',
          instruction: 'ให้นักเรียนเลือกคำตอบที่ถูกต้องที่สุดในตอนที่ 1 และตอบคำถามสั้นในตอนที่ 2',
          sections: [
            {
              title: 'ตอนที่ 1: คำถามแบบเลือกตอบ (10 ข้อ)',
              items: Array.from({ length: 10 }, (_, i) => ({
                itemNumber: i + 1,
                prompt: `ข้อที่ ${i + 1}: วิธีการแยกสารใดเหมาะสมที่สุดในการแยกสารผสมที่มีจุดเดือดต่างกันมากกว่า 30 องศาเซลเซียส?`,
                choices: [
                  'การระเหยแห้งจนตกผลึก',
                  'การกลั่นลำดับส่วนอย่างง่าย',
                  'โครมาโทกราฟีแบบกระดาษ',
                  'การสกัดด้วยกรวยแยกสาร',
                ],
              })),
            },
            {
              title: 'ตอนที่ 2: คำถามแบบเขียนตอบและให้เหตุผล (10 ข้อ)',
              items: Array.from({ length: 10 }, (_, i) => ({
                itemNumber: i + 11,
                prompt: `ข้อที่ ${i + 11}: จงอธิบายเหตุผลว่าเพราะเหตุใดการสกัดน้ำมันหอมระเหยจากผิวมะกรูดจึงนิยมใช้วิธีการกลั่นด้วยไอน้ำแทนการต้มโดยตรง?`,
                answerSpace: 'พื้นที่ตอบข้อความสั้น: ......................................................................................................................................................................................',
              })),
            },
          ],
        },
      },
      {
        id: 'asset-lc-2',
        lesson_plan_id: 'demo-long-content',
        asset_type: 'DATA_TABLE',
        title: 'ตารางบันทึกข้อมูลขนาดใหญ่ 10 แถว (10-Row Comprehensive Data Table)',
        audience: 'STUDENT',
        generation_status: 'READY',
        content: {
          instruction: 'ตารางสรุปคุณสมบัติทางกายภาพและเทคนิคการแยกสารผสมตัวอย่าง 10 ชนิด',
          dataTable: {
            title: 'ตารางวิเคราะห์คุณสมบัติและวิธีแยกสารผสม 10 รายการ',
            columns: ['ลำดับ', 'สารผสมตัวอย่าง', 'สถานะ', 'สมบัติที่แตกต่าง', 'วิธีการแยกสารที่เหมาะสม', 'ผลิตภัณฑ์ที่ได้'],
            initialRows: Array.from({ length: 10 }, (_, idx) => [
              String(idx + 1),
              `สารผสมตัวอย่าง ${idx + 1} (เช่น น้ำเกลือ/น้ำมัน)`,
              idx % 2 === 0 ? 'ของเหลวผสมของแข็ง' : 'ของเหลวผสมของเหลว',
              `จุดเดือดต่างกัน ${20 + idx * 5}°C`,
              idx % 2 === 0 ? 'การระเหยแห้ง' : 'การกลั่นลำดับส่วน',
              `สารบริสุทธิ์ตัวอย่าง ${idx + 1}`,
            ]),
          },
        },
      },
      {
        id: 'asset-lc-3',
        lesson_plan_id: 'demo-long-content',
        asset_type: 'TEACHER_GUIDE',
        title: 'คู่มือครูและแนวทางการบริหารจัดการชั้นเรียน 2 หน้า (Comprehensive Multi-Page Teacher Guide)',
        audience: 'TEACHER',
        generation_status: 'READY',
        content: {
          title: 'คู่มือการจัดกิจกรรมและการเตรียมการล่วงหน้าสำหรับครูผู้สอน (Teacher Guidance)',
          sections: [
            {
              title: '1. ภาพรวมการจัดการเรียนรู้และการกำหนดเวลา (Pacing & Pedagogical Strategy)',
              content: 'แผนการจัดการเรียนรู้นี้เน้นการจัดกิจกรรมแบบ 7 ขั้นตอน โดยแบ่งเวลาอย่างกระชับเพื่อให้นักเรียนได้ลงมือปฏิบัติครบทุกสถานี ครูควรเตรียมสารละลายและชุดอุปกรณ์ไว้ล่วงหน้าอย่างน้อย 30 นาทีก่อนเริ่มชั้นเรียน เพื่อป้องกันการเสียเวลาระหว่างคาบ\n\nการบริหารเวลา:\n- 0–15 นาทีแรก: เน้นการกระตุ้นและทบทวนความรู้เดิม ห้ามใช้เวลาเกิน 15 นาที\n- 15–45 นาที: เวลาปฏิบัติการ 30 นาทีเต็ม ครูต้องเดินสังเกตและช่วยเหลือนักเรียนที่มีปัญหาการใช้เครื่องชั่งทันที\n- 45–60 นาที: การสรุปและจัดเก็บอุปกรณ์อย่างเป็นระเบียบ',
            },
            {
              title: '2. จุดผิดพลาดยอดนิยมและความเข้าใจคลาดเคลื่อนที่พบบ่อย (Common Misconceptions)',
              content: '1) นักเรียนมักเข้าใจผิดว่า "การระเหยแห้ง" และ "การกลั่น" ให้ผลเหมือนกัน ครูต้องย้ำว่าการระเหยแห้งจะสูญเสียตัวทำละลายไปในอากาศ แต่การกลั่นสามารถควบแน่นตัวทำละลายกลับมาใช้งานได้\n2) ในการทำโครมาโทกราฟี นักเรียนมักจะจุ่มจุดสารสีลงไปมิดในตัวทำละลาย ทำให้สารสีกระจายตัวในบีกเกอร์แทนที่จะเคลื่อนที่ขึ้นบนกระดาษ ครูควรเน้นย้ำเรื่องระดับของตัวทำละลายต้องอยู่ต่ำกว่าจุดสารสีเสมอ\n3) การวัดค่า Rf ต้องวัดจากจุดเริ่มต้นถึงจุดกึ่งกลางของแถบสี ไม่ใช่วัดถึงขอบบนสุดของแถบสี',
            },
            {
              title: '3. มาตรการความปลอดภัยในการใช้อุปกรณ์และสารเคมี (Safety & Lab Regulations)',
              content: '1) การใช้ตะเกียงแอลกอฮอล์: ห้ามจุดไฟต่อจากตะเกียงอื่น และต้องมีกระป๋องทรายหรือผ้าเปียกเตรียมไว้ข้างโต๊ะปฏิบัติการเสมอ\n2) การใช้กรวยแยกสาร: ระวังแรงดันแก๊สสะสมภายในกรวย ต้องเปิดก๊อกระบายความดันเป็นระยะๆ โดยหันปลายกรวยไปในทิศทางที่ไม่มีบุคคลอื่นอยู่\n3) การจัดการสารเคมีเหลือทิ้ง: ห้ามเทตัวทำละลายอินทรีย์ลงอ่างน้ำทิ้งโดยตรง ให้รวบรวมลงในถังทิ้งของเสียอันตรายที่ครูจัดเตรียมไว้',
            },
            {
              title: '4. ข้อเสนอแนะสำหรับการจัดกิจกรรมเสริม (Differentiated Learning Recommendations)',
              content: 'สำหรับนักเรียนกลุ่มที่เรียนรู้ได้เร็ว ครูสามารถมอบหมายโจทย์ท้าทายเรื่องการคำนวณร้อยละของสารที่สกัดได้จริงเปรียบเทียบกับทฤษฎี (Percentage Yield) หรือให้ศึกษาการแยกสารในระบบสุญญากาศเพิ่มเติม ส่วนนักเรียนที่ยังสับสนเรื่องการคำนวณ ให้ใช้แผนผังภาพ (Visual Flowchart) ช่วยในการตัดสินใจเลือกวิธีแยกสาร',
            },
          ],
        },
      },
    ],
  });
}

export function getDemoLessonDocument(planId: string, options?: Partial<DocumentOptions>): V3LessonDocument | null {
  let graph: V3LessonGraph | null = null;

  if (planId === 'demo-english') {
    graph = createEnglishSpeakingGraph();
  } else if (planId === 'demo-math') {
    graph = createMathProblemSolvingGraph();
  } else if (planId === 'demo-science') {
    graph = createScienceExperimentGraph();
  } else if (planId === 'demo-rubric-stress') {
    graph = createRubricStressGraph();
  } else if (planId === 'demo-long-content') {
    graph = createLongContentGraph();
  }

  if (!graph) return null;

  const mergedOptions: DocumentOptions = {
    ...DEFAULT_DOCUMENT_OPTIONS,
    ...(options || {}),
  };

  return buildLessonDocument(graph, { options: mergedOptions });
}
