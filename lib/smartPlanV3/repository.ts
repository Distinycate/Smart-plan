import { SupabaseClient } from '@supabase/supabase-js';
import { 
  V3LessonPlan, 
  V3LessonCurriculumLink,
  V3LessonObjective, 
  V3LearningEvidence, 
  V3ObjectiveEvidenceLink,
  V3LessonActivity,
  V3ActivityObjectiveLink,
  V3ActivityEvidenceLink,
  V3Assessment,
  V3AssessmentEvidenceLink,
  V3AssessmentActivityLink,
  V3AssessmentTool,
  V3AssessmentWithLinks,
  V3TeachingAsset,
  V3TeachingAssetWithLinks,
  V3AssetObjectiveLink,
  V3AssetActivityLink,
  V3AssetEvidenceLink,
  V3PostTeachingRecord,
  V3LessonGraph,
  V3ActivityWithLinks,
  V3BlueprintActivityDraft,
} from './types';

export class V3Repository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * สร้าง Lesson Plan V3
   */
  async createLesson(data: Partial<V3LessonPlan> & { user_id: string }): Promise<V3LessonPlan> {
    const { data: lesson, error } = await this.supabase
      .from('v3_lesson_plans')
      .insert([data])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return lesson as V3LessonPlan;
  }

  /**
   * ดึงข้อมูล Lesson Plan เดียว
   */
  async getLessonById(planId: string, userId: string, isAdmin = false): Promise<V3LessonPlan | null> {
    let query = this.supabase
      .from('v3_lesson_plans')
      .select('*')
      .eq('id', planId);

    if (!isAdmin) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw new Error(error.message);
    return (data as V3LessonPlan) || null;
  }

  /**
   * อัปเดต Lesson Plan V3
   */
  async updateLesson(planId: string, data: Partial<V3LessonPlan>, userId: string, isAdmin = false): Promise<V3LessonPlan> {
    let query = this.supabase
      .from('v3_lesson_plans')
      .update(data)
      .eq('id', planId);

    if (!isAdmin) {
      query = query.eq('user_id', userId);
    }

    const { data: updated, error } = await query.select().single();

    if (error) throw new Error(error.message);
    return updated as V3LessonPlan;
  }

  /**
   * ลบ Lesson Plan V3 (Cascades to all children)
   */
  async deleteLesson(planId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('v3_lesson_plans')
      .delete()
      .eq('id', planId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  }

  /**
   * ดึงรายการ Lesson V3 ของ user
   */
  async getLessonsByUser(userId: string, isAdmin = false): Promise<V3LessonPlan[]> {
    let query = this.supabase
      .from('v3_lesson_plans')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!isAdmin) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []) as V3LessonPlan[];
  }

  // ─────────────────────────────────────────────────────────
  // Curriculum Links
  // ─────────────────────────────────────────────────────────

  /**
   * ดึง curriculum links ของ lesson (เรียงตาม position)
   */
  async getCurriculumLinks(planId: string): Promise<V3LessonCurriculumLink[]> {
    const { data, error } = await this.supabase
      .from('v3_lesson_curriculum_links')
      .select('*')
      .eq('lesson_plan_id', planId)
      .order('position', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []) as V3LessonCurriculumLink[];
  }

  /**
   * Replace all curriculum links for a lesson (idempotent)
   * Deletes existing, then inserts new batch.
   */
  async replaceCurriculumLinks(
    planId: string,
    links: Omit<V3LessonCurriculumLink, 'id' | 'created_at'>[]
  ): Promise<V3LessonCurriculumLink[]> {
    const { error: delErr } = await this.supabase
      .from('v3_lesson_curriculum_links')
      .delete()
      .eq('lesson_plan_id', planId);

    if (delErr) throw new Error(delErr.message);
    if (links.length === 0) return [];

    const rows = links.map((l, i) => ({ ...l, lesson_plan_id: planId, position: i }));
    const { data, error } = await this.supabase
      .from('v3_lesson_curriculum_links')
      .insert(rows)
      .select();

    if (error) throw new Error(error.message);
    return (data || []) as V3LessonCurriculumLink[];
  }

  /**
   * ดึงรายการ Objective ของ Lesson
   */
  async getObjectives(planId: string): Promise<V3LessonObjective[]> {
    const { data, error } = await this.supabase
      .from('v3_lesson_objectives')
      .select('*')
      .eq('lesson_plan_id', planId)
      .order('position', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []) as V3LessonObjective[];
  }

  /**
   * ดึงรายการ Evidence ของ Lesson
   */
  async getEvidence(planId: string): Promise<V3LearningEvidence[]> {
    const { data, error } = await this.supabase
      .from('v3_learning_evidence')
      .select('*')
      .eq('lesson_plan_id', planId)
      .order('position', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []) as V3LearningEvidence[];
  }

  /**
   * สร้าง Objective
   */
  async createObjective(data: Omit<V3LessonObjective, 'id' | 'created_at' | 'updated_at'>): Promise<V3LessonObjective> {
    const { data: objective, error } = await this.supabase
      .from('v3_lesson_objectives')
      .insert([data])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return objective as V3LessonObjective;
  }

  /**
   * ลบ Objective (ลบเฉพาะ junction link อัตโนมัติ ไม่ลบ Evidence ที่แชร์กับ Objective อื่น)
   */
  async deleteObjective(objectiveId: string): Promise<void> {
    const { error } = await this.supabase
      .from('v3_lesson_objectives')
      .delete()
      .eq('id', objectiveId);

    if (error) throw new Error(error.message);
  }

  /**
   * สร้าง Learning Evidence
   */
  async createEvidence(data: Omit<V3LearningEvidence, 'id' | 'created_at' | 'updated_at'>): Promise<V3LearningEvidence> {
    const { data: evidence, error } = await this.supabase
      .from('v3_learning_evidence')
      .insert([data])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return evidence as V3LearningEvidence;
  }

  /**
   * เชื่อมโยง Objective ↔ Evidence (Many-to-Many)
   */
  async linkObjectiveEvidence(objectiveId: string, evidenceId: string): Promise<V3ObjectiveEvidenceLink> {
    const { data, error } = await this.supabase
      .from('v3_objective_evidence_links')
      .insert([{ objective_id: objectiveId, evidence_id: evidenceId }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as V3ObjectiveEvidenceLink;
  }

  /**
   * ยกเลิกการเชื่อมโยง Objective ↔ Evidence
   */
  async unlinkObjectiveEvidence(objectiveId: string, evidenceId: string): Promise<void> {
    const { error } = await this.supabase
      .from('v3_objective_evidence_links')
      .delete()
      .eq('objective_id', objectiveId)
      .eq('evidence_id', evidenceId);

    if (error) throw new Error(error.message);
  }

  /**
   * สร้าง Activity
   */
  async createActivity(data: Omit<V3LessonActivity, 'id' | 'created_at' | 'updated_at'>): Promise<V3LessonActivity> {
    const { data: activity, error } = await this.supabase
      .from('v3_lesson_activities')
      .insert([data])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return activity as V3LessonActivity;
  }

  /**
   * เชื่อมโยง Activity ↔ Objective
   */
  async linkActivityObjective(activityId: string, objectiveId: string): Promise<V3ActivityObjectiveLink> {
    const { data, error } = await this.supabase
      .from('v3_activity_objective_links')
      .insert([{ activity_id: activityId, objective_id: objectiveId }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as V3ActivityObjectiveLink;
  }

  /**
   * เชื่อมโยง Activity ↔ Evidence
   */
  async linkActivityEvidence(activityId: string, evidenceId: string): Promise<V3ActivityEvidenceLink> {
    const { data, error } = await this.supabase
      .from('v3_activity_evidence_links')
      .insert([{ activity_id: activityId, evidence_id: evidenceId }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as V3ActivityEvidenceLink;
  }

  /**
   * ยกเลิกเชื่อมโยง Activity ↔ Objective
   */
  async unlinkActivityObjective(activityId: string, objectiveId: string): Promise<void> {
    const { error } = await this.supabase
      .from('v3_activity_objective_links')
      .delete()
      .eq('activity_id', activityId)
      .eq('objective_id', objectiveId);

    if (error) throw new Error(error.message);
  }

  /**
   * ยกเลิกเชื่อมโยง Activity ↔ Evidence
   */
  async unlinkActivityEvidence(activityId: string, evidenceId: string): Promise<void> {
    const { error } = await this.supabase
      .from('v3_activity_evidence_links')
      .delete()
      .eq('activity_id', activityId)
      .eq('evidence_id', evidenceId);

    if (error) throw new Error(error.message);
  }

  /**
   * ตั้งค่าเชื่อมโยง Objective หลายรายการให้ Activity (Idempotent Replace)
   */
  async setActivityObjectiveLinks(activityId: string, objectiveIds: string[]): Promise<void> {
    // Delete existing
    const { error: delErr } = await this.supabase
      .from('v3_activity_objective_links')
      .delete()
      .eq('activity_id', activityId);
    if (delErr) throw new Error(delErr.message);

    if (objectiveIds.length === 0) return;

    const rows = objectiveIds.map(objId => ({
      activity_id: activityId,
      objective_id: objId,
    }));
    const { error: insErr } = await this.supabase
      .from('v3_activity_objective_links')
      .insert(rows);
    if (insErr) throw new Error(insErr.message);
  }

  /**
   * ตั้งค่าเชื่อมโยง Evidence หลายรายการให้ Activity (Idempotent Replace)
   */
  async setActivityEvidenceLinks(activityId: string, evidenceIds: string[]): Promise<void> {
    // Delete existing
    const { error: delErr } = await this.supabase
      .from('v3_activity_evidence_links')
      .delete()
      .eq('activity_id', activityId);
    if (delErr) throw new Error(delErr.message);

    if (evidenceIds.length === 0) return;

    const rows = evidenceIds.map(evdId => ({
      activity_id: activityId,
      evidence_id: evdId,
    }));
    const { error: insErr } = await this.supabase
      .from('v3_activity_evidence_links')
      .insert(rows);
    if (insErr) throw new Error(insErr.message);
  }

  /**
   * ดึงรายการ Activities ของ Lesson พร้อม Links ของ Objective และ Evidence
   */
  async getActivities(planId: string): Promise<V3ActivityWithLinks[]> {
    const { data: activities, error: actErr } = await this.supabase
      .from('v3_lesson_activities')
      .select('*')
      .eq('lesson_plan_id', planId)
      .order('position', { ascending: true });

    if (actErr) throw new Error(actErr.message);
    if (!activities || activities.length === 0) return [];

    const activityIds = activities.map(a => a.id);

    const [objLinksRes, evdLinksRes] = await Promise.all([
      this.supabase.from('v3_activity_objective_links').select('*').in('activity_id', activityIds),
      this.supabase.from('v3_activity_evidence_links').select('*').in('activity_id', activityIds),
    ]);

    const objLinks = objLinksRes.data || [];
    const evdLinks = evdLinksRes.data || [];

    const objMap: Record<string, string[]> = {};
    for (const link of objLinks) {
      if (!objMap[link.activity_id]) objMap[link.activity_id] = [];
      objMap[link.activity_id].push(link.objective_id);
    }

    const evdMap: Record<string, string[]> = {};
    for (const link of evdLinks) {
      if (!evdMap[link.activity_id]) evdMap[link.activity_id] = [];
      evdMap[link.activity_id].push(link.evidence_id);
    }

    return activities.map(a => ({
      ...a,
      linkedObjectiveIds: objMap[a.id] || [],
      linkedEvidenceIds: evdMap[a.id] || [],
    }));
  }

  /**
   * ดึง Activity 1 รายการตาม ID
   */
  async getActivityById(activityId: string): Promise<V3ActivityWithLinks | null> {
    const { data: activity, error } = await this.supabase
      .from('v3_lesson_activities')
      .select('*')
      .eq('id', activityId)
      .single();

    if (error || !activity) return null;

    const [objLinksRes, evdLinksRes] = await Promise.all([
      this.supabase.from('v3_activity_objective_links').select('objective_id').eq('activity_id', activityId),
      this.supabase.from('v3_activity_evidence_links').select('evidence_id').eq('activity_id', activityId),
    ]);

    return {
      ...activity,
      linkedObjectiveIds: (objLinksRes.data || []).map(r => r.objective_id),
      linkedEvidenceIds: (evdLinksRes.data || []).map(r => r.evidence_id),
    };
  }

  /**
   * อัปเดต Activity (Patch)
   */
  async updateActivity(activityId: string, data: Partial<V3LessonActivity>): Promise<V3LessonActivity> {
    const { data: updated, error } = await this.supabase
      .from('v3_lesson_activities')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activityId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return updated as V3LessonActivity;
  }

  /**
   * ลบ Activity 1 รายการ
   */
  async deleteActivity(activityId: string): Promise<void> {
    const { error } = await this.supabase
      .from('v3_lesson_activities')
      .delete()
      .eq('id', activityId);

    if (error) throw new Error(error.message);
  }

  /**
   * จัดเรียงลำดับ Activities ใหม่ (Deterministic positions: 0, 1, 2...)
   */
  async reorderActivities(planId: string, activityIds: string[]): Promise<void> {
    const updates = activityIds.map((id, index) =>
      this.supabase
        .from('v3_lesson_activities')
        .update({ position: index, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('lesson_plan_id', planId)
    );

    const results = await Promise.all(updates);
    const firstErr = results.find(r => r.error);
    if (firstErr?.error) throw new Error(firstErr.error.message);
  }

  /**
   * นำ Blueprint Activities ไปบันทึกลงฐานข้อมูลจริง (Apply Blueprint)
   * รองรับโหมด 'replace' (แทนที่ชุดเดิม) หรือ 'append' (ต่อท้าย)
   */
  async applyBlueprint(
    planId: string,
    blueprintActivities: V3BlueprintActivityDraft[],
    mode: 'replace' | 'append' = 'replace'
  ): Promise<V3ActivityWithLinks[]> {
    if (mode === 'replace') {
      // ลบชุดเดิม (cascade ลบ junction table links อัตโนมัติ)
      const { error: delErr } = await this.supabase
        .from('v3_lesson_activities')
        .delete()
        .eq('lesson_plan_id', planId);
      if (delErr) throw new Error(delErr.message);
    }

    let startPosition = 0;
    if (mode === 'append') {
      const { data: existing } = await this.supabase
        .from('v3_lesson_activities')
        .select('position')
        .eq('lesson_plan_id', planId)
        .order('position', { ascending: false })
        .limit(1);
      if (existing && existing.length > 0) {
        startPosition = existing[0].position + 1;
      }
    }

    // สร้างทีละกิจกรรมและเชื่อมโยง
    const createdActivities: V3ActivityWithLinks[] = [];

    for (let i = 0; i < blueprintActivities.length; i++) {
      const draft = blueprintActivities[i];
      const position = startPosition + i;

      const teacherActionsText = Array.isArray(draft.teacherActions)
        ? draft.teacherActions.join('\n')
        : String(draft.teacherActions || '');

      const studentActionsText = Array.isArray(draft.studentActions)
        ? draft.studentActions.join('\n')
        : String(draft.studentActions || '');

      const assessmentMoment = draft.formativeCheck?.enabled
        ? draft.formativeCheck.description
        : null;

      const feedbackMoment = draft.feedback?.enabled
        ? draft.feedback.description
        : null;

      const { data: actRow, error: actErr } = await this.supabase
        .from('v3_lesson_activities')
        .insert([{
          lesson_plan_id: planId,
          position,
          phase: draft.phase,
          minutes: draft.minutes,
          title: draft.title,
          teacher_actions: teacherActionsText,
          student_actions: studentActionsText,
          assessment_moment: assessmentMoment,
          feedback_moment: feedbackMoment,
          source: 'AI',
        }])
        .select()
        .single();

      if (actErr) throw new Error(actErr.message);

      // เชื่อมโยง Objectives
      const objIds = draft.resolvedObjectiveIds || [];
      if (objIds.length > 0) {
        const objRows = objIds.map(objId => ({
          activity_id: actRow.id,
          objective_id: objId,
        }));
        await this.supabase.from('v3_activity_objective_links').insert(objRows);
      }

      // เชื่อมโยง Evidence
      const evdIds = draft.resolvedEvidenceIds || [];
      if (evdIds.length > 0) {
        const evdRows = evdIds.map(evdId => ({
          activity_id: actRow.id,
          evidence_id: evdId,
        }));
        await this.supabase.from('v3_activity_evidence_links').insert(evdRows);
      }

      createdActivities.push({
        ...actRow,
        linkedObjectiveIds: objIds,
        linkedEvidenceIds: evdIds,
      });
    }

    return createdActivities;
  }


  // ─────────────────────────────────────────────────────────
  // Wave V3.5 — Assessment Engine Repository Methods
  // ─────────────────────────────────────────────────────────

  /**
   * ดึงรายการ Assessment ทั้งหมดของ Lesson พร้อม linked evidence IDs, linked activity IDs, and attached tool
   */
  async getAssessments(planId: string): Promise<V3AssessmentWithLinks[]> {
    const { data: assessments, error } = await this.supabase
      .from('v3_assessments')
      .select('*')
      .eq('lesson_plan_id', planId)
      .order('position', { ascending: true });

    if (error) throw new Error(error.message);
    if (!assessments || assessments.length === 0) return [];

    const assessmentIds = assessments.map((a) => a.id);

    // Parallel fetch evidence links, activity links, and tools
    const [evdLinksRes, actLinksRes, toolsRes] = await Promise.all([
      this.supabase
        .from('v3_assessment_evidence_links')
        .select('*')
        .in('assessment_id', assessmentIds),
      this.supabase
        .from('v3_assessment_activity_links')
        .select('*')
        .in('assessment_id', assessmentIds),
      this.supabase
        .from('v3_assessment_tools')
        .select('*')
        .in('assessment_id', assessmentIds),
    ]);

    const evdLinks = (evdLinksRes.data || []) as V3AssessmentEvidenceLink[];
    const actLinks = (actLinksRes.data || []) as V3AssessmentActivityLink[];
    const tools = (toolsRes.data || []) as V3AssessmentTool[];

    return assessments.map((asm) => {
      const linkedEvidenceIds = evdLinks
        .filter((l) => l.assessment_id === asm.id)
        .map((l) => l.evidence_id);
      const linkedActivityIds = actLinks
        .filter((l) => l.assessment_id === asm.id)
        .map((l) => l.activity_id);
      const tool = tools.find((t) => t.assessment_id === asm.id) || null;

      return {
        ...asm,
        linkedEvidenceIds,
        linkedActivityIds,
        tool,
      };
    });
  }

  /**
   * ดึง Assessment รายการเดียว พร้อม relations
   */
  async getAssessmentById(id: string): Promise<V3AssessmentWithLinks | null> {
    const { data: asm, error } = await this.supabase
      .from('v3_assessments')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!asm) return null;

    const [evdLinksRes, actLinksRes, toolRes] = await Promise.all([
      this.supabase.from('v3_assessment_evidence_links').select('*').eq('assessment_id', id),
      this.supabase.from('v3_assessment_activity_links').select('*').eq('assessment_id', id),
      this.supabase.from('v3_assessment_tools').select('*').eq('assessment_id', id).maybeSingle(),
    ]);

    return {
      ...asm,
      linkedEvidenceIds: ((evdLinksRes.data || []) as V3AssessmentEvidenceLink[]).map((l) => l.evidence_id),
      linkedActivityIds: ((actLinksRes.data || []) as V3AssessmentActivityLink[]).map((l) => l.activity_id),
      tool: (toolRes.data || null) as V3AssessmentTool | null,
    };
  }

  /**
   * สร้าง Assessment พร้อม optional evidence/activity links และ optional Tool
   */
  async createAssessment(
    data: Omit<V3Assessment, 'id' | 'created_at' | 'updated_at'>,
    options?: {
      evidenceIds?: string[];
      activityIds?: string[];
      tool?: {
        tool_type: string;
        title: string;
        content: Record<string, any>;
        source?: 'MANUAL' | 'AI';
      };
    }
  ): Promise<V3AssessmentWithLinks> {
    const { data: assessment, error } = await this.supabase
      .from('v3_assessments')
      .insert([data])
      .select()
      .single();

    if (error) throw new Error(error.message);
    const createdAsm = assessment as V3Assessment;

    // Link evidence if provided
    if (options?.evidenceIds && options.evidenceIds.length > 0) {
      const rows = options.evidenceIds.map((evdId) => ({
        assessment_id: createdAsm.id,
        evidence_id: evdId,
      }));
      const { error: evdErr } = await this.supabase.from('v3_assessment_evidence_links').insert(rows);
      if (evdErr) console.warn('Warning linking assessment evidence:', evdErr.message);
    }

    // Link activity if provided
    if (options?.activityIds && options.activityIds.length > 0) {
      const rows = options.activityIds.map((actId) => ({
        assessment_id: createdAsm.id,
        activity_id: actId,
      }));
      const { error: actErr } = await this.supabase.from('v3_assessment_activity_links').insert(rows);
      if (actErr) console.warn('Warning linking assessment activity:', actErr.message);
    }

    // Create tool if provided
    let createdTool: V3AssessmentTool | null = null;
    if (options?.tool) {
      const toolRow = {
        assessment_id: createdAsm.id,
        tool_type: options.tool.tool_type,
        title: options.tool.title,
        content: options.tool.content || {},
        source: options.tool.source || 'MANUAL',
      };
      const { data: tData, error: tErr } = await this.supabase
        .from('v3_assessment_tools')
        .insert([toolRow])
        .select()
        .single();
      if (tErr) console.warn('Warning creating assessment tool:', tErr.message);
      else createdTool = tData as V3AssessmentTool;
    }

    return {
      ...createdAsm,
      linkedEvidenceIds: options?.evidenceIds || [],
      linkedActivityIds: options?.activityIds || [],
      tool: createdTool,
    };
  }

  /**
   * อัปเดต Assessment และ optionally replace evidence/activity links
   */
  async updateAssessment(
    id: string,
    updateData: Partial<Omit<V3Assessment, 'id' | 'lesson_plan_id' | 'created_at' | 'updated_at'>>,
    options?: {
      evidenceIds?: string[];
      activityIds?: string[];
    }
  ): Promise<V3AssessmentWithLinks> {
    const { data: assessment, error } = await this.supabase
      .from('v3_assessments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    const updatedAsm = assessment as V3Assessment;

    // Replace evidence links if explicitly provided
    if (options?.evidenceIds !== undefined) {
      await this.supabase.from('v3_assessment_evidence_links').delete().eq('assessment_id', id);
      if (options.evidenceIds.length > 0) {
        const rows = options.evidenceIds.map((evdId) => ({
          assessment_id: id,
          evidence_id: evdId,
        }));
        await this.supabase.from('v3_assessment_evidence_links').insert(rows);
      }
    }

    // Replace activity links if explicitly provided
    if (options?.activityIds !== undefined) {
      await this.supabase.from('v3_assessment_activity_links').delete().eq('assessment_id', id);
      if (options.activityIds.length > 0) {
        const rows = options.activityIds.map((actId) => ({
          assessment_id: id,
          activity_id: actId,
        }));
        await this.supabase.from('v3_assessment_activity_links').insert(rows);
      }
    }

    return (await this.getAssessmentById(id)) || {
      ...updatedAsm,
      linkedEvidenceIds: options?.evidenceIds || [],
      linkedActivityIds: options?.activityIds || [],
    };
  }

  /**
   * ลบ Assessment
   * ลบเฉพาะ links และ tool ที่เป็นของ assessment นี้
   * ห้ามแตะ v3_learning_evidence, v3_lesson_objectives, v3_lesson_activities
   */
  async deleteAssessment(id: string): Promise<void> {
    // Delete dependent junction & tool rows first (defensive for local test mocks)
    await Promise.all([
      this.supabase.from('v3_assessment_evidence_links').delete().eq('assessment_id', id),
      this.supabase.from('v3_assessment_activity_links').delete().eq('assessment_id', id),
      this.supabase.from('v3_assessment_tools').delete().eq('assessment_id', id),
    ]);

    const { error } = await this.supabase.from('v3_assessments').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  /**
   * เชื่อมโยง Assessment ↔ Evidence
   */
  async linkAssessmentEvidence(assessmentId: string, evidenceId: string): Promise<V3AssessmentEvidenceLink> {
    const { data, error } = await this.supabase
      .from('v3_assessment_evidence_links')
      .insert([{ assessment_id: assessmentId, evidence_id: evidenceId }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as V3AssessmentEvidenceLink;
  }

  /**
   * ยกเลิกการเชื่อมโยง Assessment ↔ Evidence
   */
  async unlinkAssessmentEvidence(assessmentId: string, evidenceId: string): Promise<void> {
    const { error } = await this.supabase
      .from('v3_assessment_evidence_links')
      .delete()
      .eq('assessment_id', assessmentId)
      .eq('evidence_id', evidenceId);

    if (error) throw new Error(error.message);
  }

  /**
   * เชื่อมโยง Assessment ↔ Activity
   */
  async linkAssessmentActivity(assessmentId: string, activityId: string): Promise<V3AssessmentActivityLink> {
    const { data, error } = await this.supabase
      .from('v3_assessment_activity_links')
      .insert([{ assessment_id: assessmentId, activity_id: activityId }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as V3AssessmentActivityLink;
  }

  /**
   * ยกเลิกการเชื่อมโยง Assessment ↔ Activity
   */
  async unlinkAssessmentActivity(assessmentId: string, activityId: string): Promise<void> {
    const { error } = await this.supabase
      .from('v3_assessment_activity_links')
      .delete()
      .eq('assessment_id', assessmentId)
      .eq('activity_id', activityId);

    if (error) throw new Error(error.message);
  }

  /**
   * สร้าง Assessment Tool
   */
  async createAssessmentTool(data: Omit<V3AssessmentTool, 'id' | 'created_at' | 'updated_at'>): Promise<V3AssessmentTool> {
    const { data: tool, error } = await this.supabase
      .from('v3_assessment_tools')
      .insert([data])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return tool as V3AssessmentTool;
  }

  /**
   * อัปเดต Assessment Tool
   */
  async updateAssessmentTool(
    toolId: string,
    updateData: Partial<Omit<V3AssessmentTool, 'id' | 'assessment_id' | 'created_at' | 'updated_at'>>
  ): Promise<V3AssessmentTool> {
    const { data: tool, error } = await this.supabase
      .from('v3_assessment_tools')
      .update(updateData)
      .eq('id', toolId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return tool as V3AssessmentTool;
  }

  /**
   * ลบ Assessment Tool
   */
  async deleteAssessmentTool(toolId: string): Promise<void> {
    const { error } = await this.supabase.from('v3_assessment_tools').delete().eq('id', toolId);
    if (error) throw new Error(error.message);
  }

  /**
   * ดึงรายการ Teaching Assets ทั้งหมดของแผน พร้อม links
   */
  async getTeachingAssets(planId: string): Promise<V3TeachingAssetWithLinks[]> {
    const { data: assets, error } = await this.supabase
      .from('v3_teaching_assets')
      .select('*')
      .eq('lesson_plan_id', planId)
      .order('position', { ascending: true });

    if (error) throw new Error(error.message);
    const assetList = (assets || []) as V3TeachingAsset[];
    if (assetList.length === 0) return [];

    const assetIds = assetList.map((a) => a.id);
    const [objLinksRes, actLinksRes, evdLinksRes] = await Promise.all([
      this.supabase.from('v3_asset_objective_links').select('*').in('asset_id', assetIds),
      this.supabase.from('v3_asset_activity_links').select('*').in('asset_id', assetIds),
      this.supabase.from('v3_asset_evidence_links').select('*').in('asset_id', assetIds),
    ]);

    const objMap = new Map<string, string[]>();
    (objLinksRes.data || []).forEach((l: any) => {
      const list = objMap.get(l.asset_id) || [];
      list.push(l.objective_id);
      objMap.set(l.asset_id, list);
    });

    const actMap = new Map<string, string[]>();
    (actLinksRes.data || []).forEach((l: any) => {
      const list = actMap.get(l.asset_id) || [];
      list.push(l.activity_id);
      actMap.set(l.asset_id, list);
    });

    const evdMap = new Map<string, string[]>();
    (evdLinksRes.data || []).forEach((l: any) => {
      const list = evdMap.get(l.asset_id) || [];
      list.push(l.evidence_id);
      evdMap.set(l.asset_id, list);
    });

    return assetList.map((a) => ({
      ...a,
      linkedObjectiveIds: objMap.get(a.id) || [],
      linkedActivityIds: actMap.get(a.id) || [],
      linkedEvidenceIds: evdMap.get(a.id) || [],
    }));
  }

  /**
   * ดึง Teaching Asset เดี่ยวพร้อม links
   */
  async getTeachingAssetById(id: string): Promise<V3TeachingAssetWithLinks | null> {
    const { data: asset, error } = await this.supabase
      .from('v3_teaching_assets')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!asset) return null;

    const [objLinksRes, actLinksRes, evdLinksRes] = await Promise.all([
      this.supabase.from('v3_asset_objective_links').select('*').eq('asset_id', id),
      this.supabase.from('v3_asset_activity_links').select('*').eq('asset_id', id),
      this.supabase.from('v3_asset_evidence_links').select('*').eq('asset_id', id),
    ]);

    return {
      ...(asset as V3TeachingAsset),
      linkedObjectiveIds: (objLinksRes.data || []).map((l: any) => l.objective_id),
      linkedActivityIds: (actLinksRes.data || []).map((l: any) => l.activity_id),
      linkedEvidenceIds: (evdLinksRes.data || []).map((l: any) => l.evidence_id),
    };
  }

  /**
   * สร้าง Teaching Asset พร้อม links (ถ้ามี)
   */
  async createTeachingAsset(
    data: Omit<V3TeachingAsset, 'id' | 'created_at' | 'updated_at'>,
    options?: {
      objectiveIds?: string[];
      activityIds?: string[];
      evidenceIds?: string[];
    }
  ): Promise<V3TeachingAssetWithLinks> {
    const { data: asset, error } = await this.supabase
      .from('v3_teaching_assets')
      .insert([data])
      .select()
      .single();

    if (error) throw new Error(error.message);
    const createdAsset = asset as V3TeachingAsset;

    // Link Objectives
    if (options?.objectiveIds && options.objectiveIds.length > 0) {
      const rows = options.objectiveIds.map((objId) => ({
        asset_id: createdAsset.id,
        objective_id: objId,
      }));
      const { error: objErr } = await this.supabase.from('v3_asset_objective_links').insert(rows);
      if (objErr) console.warn('Warning linking asset objective:', objErr.message);
    }

    // Link Activities
    if (options?.activityIds && options.activityIds.length > 0) {
      const rows = options.activityIds.map((actId) => ({
        asset_id: createdAsset.id,
        activity_id: actId,
      }));
      const { error: actErr } = await this.supabase.from('v3_asset_activity_links').insert(rows);
      if (actErr) console.warn('Warning linking asset activity:', actErr.message);
    }

    // Link Evidence
    if (options?.evidenceIds && options.evidenceIds.length > 0) {
      const rows = options.evidenceIds.map((evdId) => ({
        asset_id: createdAsset.id,
        evidence_id: evdId,
      }));
      const { error: evdErr } = await this.supabase.from('v3_asset_evidence_links').insert(rows);
      if (evdErr) console.warn('Warning linking asset evidence:', evdErr.message);
    }

    return {
      ...createdAsset,
      linkedObjectiveIds: options?.objectiveIds || [],
      linkedActivityIds: options?.activityIds || [],
      linkedEvidenceIds: options?.evidenceIds || [],
    };
  }

  /**
   * อัปเดต Teaching Asset และ optionally replace links
   */
  async updateTeachingAsset(
    id: string,
    updateData: Partial<Omit<V3TeachingAsset, 'id' | 'lesson_plan_id' | 'created_at' | 'updated_at'>>,
    options?: {
      objectiveIds?: string[];
      activityIds?: string[];
      evidenceIds?: string[];
    }
  ): Promise<V3TeachingAssetWithLinks> {
    const { data: asset, error } = await this.supabase
      .from('v3_teaching_assets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    const updatedAsset = asset as V3TeachingAsset;

    // Replace objective links if explicitly provided
    if (options?.objectiveIds !== undefined) {
      await this.supabase.from('v3_asset_objective_links').delete().eq('asset_id', id);
      if (options.objectiveIds.length > 0) {
        const rows = options.objectiveIds.map((objId) => ({
          asset_id: id,
          objective_id: objId,
        }));
        await this.supabase.from('v3_asset_objective_links').insert(rows);
      }
    }

    // Replace activity links if explicitly provided
    if (options?.activityIds !== undefined) {
      await this.supabase.from('v3_asset_activity_links').delete().eq('asset_id', id);
      if (options.activityIds.length > 0) {
        const rows = options.activityIds.map((actId) => ({
          asset_id: id,
          activity_id: actId,
        }));
        await this.supabase.from('v3_asset_activity_links').insert(rows);
      }
    }

    // Replace evidence links if explicitly provided
    if (options?.evidenceIds !== undefined) {
      await this.supabase.from('v3_asset_evidence_links').delete().eq('asset_id', id);
      if (options.evidenceIds.length > 0) {
        const rows = options.evidenceIds.map((evdId) => ({
          asset_id: id,
          evidence_id: evdId,
        }));
        await this.supabase.from('v3_asset_evidence_links').insert(rows);
      }
    }

    return (await this.getTeachingAssetById(id)) || {
      ...updatedAsset,
      linkedObjectiveIds: options?.objectiveIds || [],
      linkedActivityIds: options?.activityIds || [],
      linkedEvidenceIds: options?.evidenceIds || [],
    };
  }

  /**
   * ลบ Teaching Asset
   * ลบเฉพาะ links ที่เป็นของ asset นี้
   * ห้ามแตะ v3_lesson_objectives, v3_lesson_activities, v3_learning_evidence, v3_assessments
   */
  async deleteTeachingAsset(id: string): Promise<void> {
    await Promise.all([
      this.supabase.from('v3_asset_objective_links').delete().eq('asset_id', id),
      this.supabase.from('v3_asset_activity_links').delete().eq('asset_id', id),
      this.supabase.from('v3_asset_evidence_links').delete().eq('asset_id', id),
    ]);

    const { error } = await this.supabase.from('v3_teaching_assets').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  /**
   * Link Helpers for Teaching Assets
   */
  async linkAssetObjective(assetId: string, objectiveId: string): Promise<V3AssetObjectiveLink> {
    const { data, error } = await this.supabase
      .from('v3_asset_objective_links')
      .insert([{ asset_id: assetId, objective_id: objectiveId }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as V3AssetObjectiveLink;
  }

  async unlinkAssetObjective(assetId: string, objectiveId: string): Promise<void> {
    const { error } = await this.supabase
      .from('v3_asset_objective_links')
      .delete()
      .eq('asset_id', assetId)
      .eq('objective_id', objectiveId);
    if (error) throw new Error(error.message);
  }

  async linkAssetActivity(assetId: string, activityId: string): Promise<V3AssetActivityLink> {
    const { data, error } = await this.supabase
      .from('v3_asset_activity_links')
      .insert([{ asset_id: assetId, activity_id: activityId }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as V3AssetActivityLink;
  }

  async unlinkAssetActivity(assetId: string, activityId: string): Promise<void> {
    const { error } = await this.supabase
      .from('v3_asset_activity_links')
      .delete()
      .eq('asset_id', assetId)
      .eq('activity_id', activityId);
    if (error) throw new Error(error.message);
  }

  async linkAssetEvidence(assetId: string, evidenceId: string): Promise<V3AssetEvidenceLink> {
    const { data, error } = await this.supabase
      .from('v3_asset_evidence_links')
      .insert([{ asset_id: assetId, evidence_id: evidenceId }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as V3AssetEvidenceLink;
  }

  async unlinkAssetEvidence(assetId: string, evidenceId: string): Promise<void> {
    const { error } = await this.supabase
      .from('v3_asset_evidence_links')
      .delete()
      .eq('asset_id', assetId)
      .eq('evidence_id', evidenceId);
    if (error) throw new Error(error.message);
  }

  /**
   * Single Source of Truth Graph Loader
   * ดึงข้อมูลทุกมิติของ Lesson V3 ในคำขอเดียว
   */
  async getLessonGraph(planId: string, userId: string, isAdmin = false): Promise<V3LessonGraph | null> {
    const lesson = await this.getLessonById(planId, userId, isAdmin);
    if (!lesson) return null;

    // Parallel fetch related domain collections
    const [
      objectivesRes,
      evidenceRes,
      activitiesRes,
      assessmentsRes,
      assetsRes,
      postTeachingRes
    ] = await Promise.all([
      this.supabase.from('v3_lesson_objectives').select('*').eq('lesson_plan_id', planId).order('position', { ascending: true }),
      this.supabase.from('v3_learning_evidence').select('*').eq('lesson_plan_id', planId).order('position', { ascending: true }),
      this.supabase.from('v3_lesson_activities').select('*').eq('lesson_plan_id', planId).order('position', { ascending: true }),
      this.supabase.from('v3_assessments').select('*').eq('lesson_plan_id', planId).order('position', { ascending: true }),
      this.supabase.from('v3_teaching_assets').select('*').eq('lesson_plan_id', planId).order('position', { ascending: true }),
      this.supabase.from('v3_post_teaching_records').select('*').eq('lesson_plan_id', planId).maybeSingle(),
    ]);

    const objectives = (objectivesRes.data || []) as V3LessonObjective[];
    const evidence = (evidenceRes.data || []) as V3LearningEvidence[];
    const activities = (activitiesRes.data || []) as V3LessonActivity[];
    const assessments = (assessmentsRes.data || []) as V3Assessment[];
    const teachingAssets = (assetsRes.data || []) as V3TeachingAsset[];
    const postTeaching = (postTeachingRes.data || null) as V3PostTeachingRecord | null;

    const objectiveIds = objectives.map(o => o.id);
    const activityIds = activities.map(a => a.id);
    const assessmentIds = assessments.map(a => a.id);
    const assetIds = teachingAssets.map(a => a.id);

    // Fetch Junction Links & Tools
    const [
      objEvdLinksRes,
      actObjLinksRes,
      actEvdLinksRes,
      asmEvdLinksRes,
      asmActLinksRes,
      asmToolsRes,
      assetObjLinksRes,
      assetActLinksRes,
      assetEvdLinksRes,
    ] = await Promise.all([
      objectiveIds.length > 0 
        ? this.supabase.from('v3_objective_evidence_links').select('*').in('objective_id', objectiveIds)
        : { data: [] },
      activityIds.length > 0
        ? this.supabase.from('v3_activity_objective_links').select('*').in('activity_id', activityIds)
        : { data: [] },
      activityIds.length > 0
        ? this.supabase.from('v3_activity_evidence_links').select('*').in('activity_id', activityIds)
        : { data: [] },
      assessmentIds.length > 0
        ? this.supabase.from('v3_assessment_evidence_links').select('*').in('assessment_id', assessmentIds)
        : { data: [] },
      assessmentIds.length > 0
        ? this.supabase.from('v3_assessment_activity_links').select('*').in('assessment_id', assessmentIds)
        : { data: [] },
      assessmentIds.length > 0
        ? this.supabase.from('v3_assessment_tools').select('*').in('assessment_id', assessmentIds)
        : { data: [] },
      assetIds.length > 0
        ? this.supabase.from('v3_asset_objective_links').select('*').in('asset_id', assetIds)
        : { data: [] },
      assetIds.length > 0
        ? this.supabase.from('v3_asset_activity_links').select('*').in('asset_id', assetIds)
        : { data: [] },
      assetIds.length > 0
        ? this.supabase.from('v3_asset_evidence_links').select('*').in('asset_id', assetIds)
        : { data: [] },
    ]);

    // Curriculum Links
    const curriculumLinks = await this.getCurriculumLinks(planId);

    return {
      lesson,
      curriculumLinks,
      objectives,
      evidence,
      objectiveEvidenceLinks: (objEvdLinksRes.data || []) as V3ObjectiveEvidenceLink[],
      activities,
      activityObjectiveLinks: (actObjLinksRes.data || []) as V3ActivityObjectiveLink[],
      activityEvidenceLinks: (actEvdLinksRes.data || []) as V3ActivityEvidenceLink[],
      assessments,
      assessmentEvidenceLinks: (asmEvdLinksRes.data || []) as V3AssessmentEvidenceLink[],
      assessmentActivityLinks: (asmActLinksRes.data || []) as V3AssessmentActivityLink[],
      assessmentTools: (asmToolsRes.data || []) as V3AssessmentTool[],
      teachingAssets,
      assetObjectiveLinks: (assetObjLinksRes.data || []) as V3AssetObjectiveLink[],
      assetActivityLinks: (assetActLinksRes.data || []) as V3AssetActivityLink[],
      assetEvidenceLinks: (assetEvdLinksRes.data || []) as V3AssetEvidenceLink[],
      postTeaching,
    };
  }
}
