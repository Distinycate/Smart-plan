import { SupabaseClient } from '@supabase/supabase-js';
import { 
  V3LessonPlan, 
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
  V3LessonGraph 
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
  async updateLesson(planId: string, data: Partial<V3LessonPlan>, userId: string): Promise<V3LessonPlan> {
    const { data: updated, error } = await this.supabase
      .from('v3_lesson_plans')
      .update(data)
      .eq('id', planId)
      .eq('user_id', userId)
      .select()
      .single();

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

    return {
      lesson,
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
