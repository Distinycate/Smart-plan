import type { LessonPlan } from '../schema';
import type { ValidationIssue } from './types';
import {
  allObjectives,
  dedupeIssues,
  looselyMatches,
  meaningful,
  uniqueStrings,
} from './utils';

export interface AlignmentMatrixRow {
  indicatorCode: string;
  objectiveMatches: string[];
  activityMatches: string[];
  assessmentMatches: string[];
  rubricMatches: string[];
  status: 'complete' | 'partial' | 'missing';
}

export interface AlignmentCheckResult {
  aligned: boolean;
  score: number;
  maxScore: 20;
  issues: ValidationIssue[];
  matrix: AlignmentMatrixRow[];
}

const activityText = (activity: LessonPlan['learningActivities'][number]) =>
  [
    activity.step,
    activity.teacherRole,
    activity.studentRole,
    ...(activity.expectedEvidence || []),
  ].join(' ');

export function validateAlignment(plan: LessonPlan): AlignmentCheckResult {
  const objectives = allObjectives(plan);
  const issues: ValidationIssue[] = [];

  if (!plan.curriculum.standards.length) {
    issues.push({
      code: 'ALIGNMENT_STANDARDS_MISSING',
      section: 'curriculum.standards',
      severity: 'critical',
      message: 'ไม่สามารถตรวจ alignment ได้เพราะไม่มีมาตรฐาน',
      suggestion: 'เพิ่มมาตรฐานการเรียนรู้ก่อนตรวจความสอดคล้อง',
    });
  }

  if (!plan.curriculum.indicators.length) {
    issues.push({
      code: 'ALIGNMENT_INDICATORS_MISSING',
      section: 'curriculum.indicators',
      severity: 'critical',
      message: 'ไม่สามารถตรวจ alignment ได้เพราะไม่มีตัวชี้วัด',
      suggestion: 'เพิ่มตัวชี้วัดก่อนตรวจความสอดคล้อง',
    });
  }

  const matrix = plan.curriculum.indicators.map(indicator => {
    const linkedActivities = plan.learningActivities.filter(activity =>
      (activity.relatedIndicators || []).some(reference =>
        looselyMatches(reference, indicator.code || indicator.description)
      )
    );
    const inferredObjectiveReferences = linkedActivities
      .flatMap(activity => activity.relatedObjectives || []);
    const objectiveMatches = objectives.filter(objective =>
      inferredObjectiveReferences.some(reference =>
        looselyMatches(reference, objective)
      )
      || looselyMatches(objective, indicator.description)
    );

    const activityMatches = plan.learningActivities
      .filter(activity =>
        linkedActivities.includes(activity)
        || objectiveMatches.some(objective =>
          (activity.relatedObjectives || []).some(reference =>
            looselyMatches(reference, objective)
          )
          || looselyMatches(activityText(activity), objective)
        )
      )
      .map(activity => activity.step);

    const assessmentMethods = plan.assessment.methods.filter(method =>
      (method.targetIndicators || []).some(reference =>
        looselyMatches(reference, indicator.code || indicator.description)
      )
      || objectiveMatches.some(objective =>
        method.targetObjectives.some(reference =>
          looselyMatches(reference, objective)
        )
      )
    );
    const assessmentTools = plan.assessment.tools.filter(tool =>
      objectiveMatches.some(objective =>
        tool.targetObjectives.some(reference =>
          looselyMatches(reference, objective)
        )
      )
    );
    const assessmentMatches = uniqueStrings([
      ...assessmentMethods.map(method => method.name),
      ...assessmentTools.map(tool => tool.name),
    ]);

    const targetedRubricTools = assessmentTools
      .filter(tool => tool.type === 'rubric');
    const rubricMatches = plan.rubric
      .filter(rubric =>
        rubric.criteria.some(criterion =>
          objectiveMatches.some(objective =>
            looselyMatches(criterion.name, objective)
          )
        )
        || targetedRubricTools.length > 0
      )
      .map(rubric => rubric.title);

    const completedLinks = [
      objectiveMatches.length,
      activityMatches.length,
      assessmentMatches.length,
      rubricMatches.length,
    ].filter(Boolean).length;
    const status = completedLinks === 4
      ? 'complete'
      : completedLinks > 0
        ? 'partial'
        : 'missing';

    if (status !== 'complete') {
      issues.push({
        code: 'INDICATOR_CHAIN_INCOMPLETE',
        section: `curriculum.indicators.${indicator.code || 'unspecified'}`,
        severity: status === 'missing' ? 'high' : 'medium',
        message: `ตัวชี้วัด ${indicator.code || indicator.description} เชื่อมโยงไม่ครบถึง rubric`,
        suggestion: 'ระบุ objective, activity, assessment และ rubric ที่รองรับตัวชี้วัดนี้ให้ชัดเจน',
      });
    }

    const hasTerminalEvidence = assessmentMethods.some(method =>
      method.type === 'of_learning'
    ) || assessmentTools.some(tool =>
      ['performance_task', 'portfolio', 'rubric'].includes(tool.type)
    ) || plan.assessment.evidence.some(meaningful);
    if (indicator.type === 'terminal' && !hasTerminalEvidence) {
      issues.push({
        code: 'TERMINAL_INDICATOR_SUMMATIVE_MISSING',
        section: 'assessment',
        severity: 'high',
        message: `ตัวชี้วัดปลายทาง ${indicator.code || indicator.description} ไม่มีหลักฐาน summative/performance`,
        suggestion: 'เพิ่มภาระงานปลายทางและเครื่องมือประเมินตามสภาพจริง',
      });
    }

    const hasDuringEvidence = assessmentMethods.some(method =>
      method.type === 'for_learning' || method.type === 'as_learning'
    ) || assessmentTools.some(tool =>
      tool.type === 'observation' || tool.type === 'checklist'
    );
    if (indicator.type === 'during' && !hasDuringEvidence) {
      issues.push({
        code: 'DURING_INDICATOR_FORMATIVE_MISSING',
        section: 'assessment',
        severity: 'medium',
        message: `ตัวชี้วัดระหว่างทาง ${indicator.code || indicator.description} ยังไม่มี formative assessment ชัดเจน`,
        suggestion: 'เพิ่มการสังเกต คำถามสะท้อนคิด checklist หรือ assessment for/as learning',
      });
    }

    return {
      indicatorCode: indicator.code,
      objectiveMatches: uniqueStrings(objectiveMatches),
      activityMatches: uniqueStrings(activityMatches),
      assessmentMatches,
      rubricMatches: uniqueStrings(rubricMatches),
      status,
    } satisfies AlignmentMatrixRow;
  });

  for (const objective of objectives) {
    const hasActivity = plan.learningActivities.some(activity =>
      (activity.relatedObjectives || []).some(reference =>
        looselyMatches(reference, objective)
      ) || looselyMatches(activityText(activity), objective)
    );
    const hasAssessment = plan.assessment.methods.some(method =>
      method.targetObjectives.some(reference =>
        looselyMatches(reference, objective)
      )
    ) && plan.assessment.tools.some(tool =>
      tool.targetObjectives.some(reference =>
        looselyMatches(reference, objective)
      )
    );

    if (!hasActivity) {
      issues.push({
        code: 'OBJECTIVE_ACTIVITY_GAP',
        section: 'learningActivities',
        severity: 'high',
        message: `ไม่พบกิจกรรมที่รองรับจุดประสงค์: ${objective}`,
        suggestion: 'เชื่อม relatedObjectives ของกิจกรรมให้ตรงกับจุดประสงค์',
      });
    }
    if (!hasAssessment) {
      issues.push({
        code: 'OBJECTIVE_ASSESSMENT_GAP',
        section: 'assessment',
        severity: 'high',
        message: `ไม่พบทั้งวิธีและเครื่องมือประเมินจุดประสงค์: ${objective}`,
        suggestion: 'เพิ่ม targetObjectives ให้ assessment method และ tool ที่เกี่ยวข้อง',
      });
    }
  }

  const rawMax = matrix.length * 4;
  const rawScore = matrix.reduce((total, row) => total + [
    row.objectiveMatches.length,
    row.activityMatches.length,
    row.assessmentMatches.length,
    row.rubricMatches.length,
  ].filter(Boolean).length, 0);
  const score = rawMax > 0
    ? Math.round((rawScore / rawMax) * 20 * 100) / 100
    : 0;
  const normalizedIssues = dedupeIssues(issues);

  return {
    aligned: score >= 16
      && !normalizedIssues.some(issue =>
        issue.severity === 'critical' || issue.severity === 'high'
      ),
    score,
    maxScore: 20,
    issues: normalizedIssues,
    matrix,
  };
}
