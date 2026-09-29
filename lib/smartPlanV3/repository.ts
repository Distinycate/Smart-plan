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
  V3AssessmentTool,
  V3TeachingAsset,
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


  /**
   * สร้าง Assessment
   */
  async createAssessment(data: Omit<V3Assessment, 'id' | 'created_at' | 'updated_at'>): Promise<V3Assessment> {
    const { data: assessment, error } = await this.supabase
      .from('v3_assessments')
      .insert([data])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return assessment as V3Assessment;
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
   * สร้าง Teaching Asset
   */
  async createTeachingAsset(data: Omit<V3TeachingAsset, 'id' | 'created_at' | 'updated_at'>): Promise<V3TeachingAsset> {
    const { data: asset, error } = await this.supabase
      .from('v3_teaching_assets')
      .insert([data])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return asset as V3TeachingAsset;
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

    // Fetch Junction Links & Tools
    const [
      objEvdLinksRes,
      actObjLinksRes,
      actEvdLinksRes,
      asmEvdLinksRes,
      asmToolsRes
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
        ? this.supabase.from('v3_assessment_tools').select('*').in('assessment_id', assessmentIds)
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
      assessmentTools: (asmToolsRes.data || []) as V3AssessmentTool[],
      teachingAssets,
      postTeaching,
    };
  }
}
