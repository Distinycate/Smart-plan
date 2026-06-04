'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  Save, 
  ChevronRight, 
  ChevronLeft, 
  ArrowLeft, 
  Info,
  CheckCircle,
  HelpCircle,
  FileDown,
  BookOpen,
  Layers
} from 'lucide-react';
import SmartDropdown from '../components/SmartDropdown';
import {
  SubjectCurriculumData,
  getSubjectsByGrade,
  getAllGradeLevels,
  formatStandards,
  formatDuringIndicators,
  formatFinalIndicators,
} from '../../lib/subjectStandardsData';

interface PlanFormProps {
  planId?: string;
  isAdmin?: boolean;
}

// Helper to clean JSON syntax, brackets, braces, and quotes from string values
const cleanJSONString = (val: any): string => {
  if (!val) return '';
  let strVal = typeof val === 'string' ? val : JSON.stringify(val);
  strVal = strVal.trim();
  if (strVal.startsWith('[') || strVal.startsWith('{')) {
    try {
      const parsed = JSON.parse(strVal);
      if (Array.isArray(parsed)) {
        return parsed.map(x => cleanJSONString(x)).join('\n');
      }
      if (typeof parsed === 'object') {
        if (parsed.measure) return cleanJSONString(parsed.measure);
        if (parsed.optionText) return cleanJSONString(parsed.optionText);
        if (parsed.text) return cleanJSONString(parsed.text);
        return Object.values(parsed).map(x => cleanJSONString(x)).join('\n');
      }
    } catch (e) {
      // fallback
    }
  }
  // Remove typical JSON syntax brackets, double-quotes, braces and escaped quotes
  return strVal.replace(/[{}|[\]"]/g, '').trim();
};

// Helper to format values as clean, newline-separated bullet points
const ensureBulletString = (val: any): string => {
  if (!val) return '';
  
  if (Array.isArray(val)) {
    return val
      .map(item => {
        let cleaned = cleanJSONString(item);
        if (cleaned && !cleaned.startsWith('-') && !cleaned.startsWith('*')) {
          cleaned = `- ${cleaned}`;
        }
        return cleaned;
      })
      .filter(Boolean)
      .join('\n');
  }
  
  let strVal = String(val).trim();
  if (strVal.startsWith('[') || strVal.startsWith('{')) {
    try {
      const parsed = JSON.parse(strVal);
      return ensureBulletString(parsed);
    } catch (e) {
      // not valid JSON, proceed as regular string
    }
  }
  
  return strVal
    .split('\n')
    .map(line => {
      let cleaned = cleanJSONString(line);
      if (cleaned && !cleaned.startsWith('-') && !cleaned.startsWith('*')) {
        cleaned = `- ${cleaned}`;
      }
      return cleaned;
    })
    .filter(Boolean)
    .join('\n');
};

const getCleanedPayload = (fieldsObj: any) => {
  const cleanedFields: Record<string, any> = {};
  Object.keys(fieldsObj).forEach(key => {
    if (typeof fieldsObj[key] === 'string') {
      if (['competencies', 'desiredAttributes', 'skills21', 'learningMedia', 'learningSources', 'tasks'].includes(key)) {
        cleanedFields[key] = ensureBulletString(fieldsObj[key]);
      } else {
        cleanedFields[key] = cleanJSONString(fieldsObj[key]);
      }
    } else {
      cleanedFields[key] = fieldsObj[key];
    }
  });
  return cleanedFields;
};

const keepExisting = (currentVal: any, templateVal: any): string => {
  const current = String(currentVal || '').trim();
  if (current) return current;
  return String(templateVal || '').trim();
};

const buildTemplateLearningContent = (topic: any): string => {
  return [
    topic.learningContent,
    topic.grammarFocus ? `Grammar Focus: ${topic.grammarFocus}` : '',
    topic.vocabulary ? `Vocabulary: ${topic.vocabulary}` : ''
  ].filter(Boolean).join('\n');
};

const buildTemplateLearningProcess = (topic: any): string => {
  return [
    topic.teachingMethods ? `วิธีการสอน / เทคนิค: ${topic.teachingMethods}` : '',
    topic.highlightActivity ? `กิจกรรมเด่น: ${topic.highlightActivity}` : ''
  ].filter(Boolean).join('\n');
};

const normalizeGradeLevel = (grade: any): string => {
  const text = String(grade || '').trim();
  if (!text) return '';
  if (text === 'ม.1' || text.includes('ปีที่ 1')) return 'ม.1';
  if (text === 'ม.2' || text.includes('ปีที่ 2')) return 'ม.2';
  if (text === 'ม.3' || text.includes('ปีที่ 3')) return 'ม.3';
  return text;
};

const toHeaderGradeLevel = (grade: any): string => {
  const shortGrade = normalizeGradeLevel(grade);
  if (shortGrade === 'ม.1') return 'มัธยมศึกษาปีที่ 1';
  if (shortGrade === 'ม.2') return 'มัธยมศึกษาปีที่ 2';
  if (shortGrade === 'ม.3') return 'มัธยมศึกษาปีที่ 3';
  return String(grade || '');
};

const gradeLevelMatches = (candidate: any, selected: any): boolean => {
  const candidateGrade = normalizeGradeLevel(candidate);
  const selectedGrade = normalizeGradeLevel(selected);
  return !!candidateGrade && !!selectedGrade && candidateGrade === selectedGrade;
};

type AssessmentDomain = 'K' | 'P' | 'A';
type AssessmentChoiceField = 'method' | 'tool' | 'criteria';

const parseAssessmentTemplate = (option: any) => {
  try {
    return JSON.parse(option.optionText || '{}');
  } catch (e) {
    return null;
  }
};

const getAssessmentGroupLabel = (group: string) => {
  if (group === 'English_Basic') return '[พื้นฐาน]';
  if (group === 'English_Communication') return '[สื่อสาร]';
  if (group === 'KPA_Generic') return '[ทั่วไป]';
  return group ? `[${group}]` : '';
};

const formatOptionWithGroupPrefix = (opt: any) => {
  let label = opt.optionName;
  try {
    const data = JSON.parse(opt.optionText || '{}');
    if (data.group) {
      const prefix = getAssessmentGroupLabel(data.group);
      if (prefix) {
        label = `${prefix} ${label}`.trim();
      }
    }
  } catch (e) {}
  return label;
};

const splitAssessmentChoices = (value: any) =>
  String(value || '')
    .split(';')
    .map(item => item.trim())
    .filter(Boolean);

const buildAssessmentChoiceOptions = (
  templates: any[] = [],
  domain: AssessmentDomain,
  field: AssessmentChoiceField,
  currentValue: any
) => {
  const currentItems = splitAssessmentChoices(currentValue);
  const seen = new Set<string>();
  const choices: Array<{ id: string; label: string; value: string; selected?: boolean }> = [];

  templates.forEach(option => {
    const data = parseAssessmentTemplate(option);
    if (!data || !String(data.domain || '').includes(domain)) return;

    splitAssessmentChoices(data[field]).forEach((choice, index) => {
      if (seen.has(choice)) return;
      seen.add(choice);

      const groupLabel = getAssessmentGroupLabel(data.group);
      const measureContext = data.measure ? `${groupLabel} ${data.measure}`.trim() : groupLabel;
      choices.push({
        id: `${option.optionId}-${field}-${index}`,
        label: choice,
        value: measureContext,
        selected: currentItems.includes(choice) || String(currentValue || '').trim() === choice
      });
    });
  });

  return choices;
};

const withSyncedAssessmentMeasures = (sourceFields: Record<string, any>) => ({
  ...sourceFields,
  measureK: cleanJSONString(sourceFields.objectiveK),
  measureP: cleanJSONString(sourceFields.objectiveP),
  measureA: cleanJSONString(sourceFields.objectiveA)
});

const applyTopicTemplateDefaults = (baseFields: Record<string, any>, topic: any) => {
  const learningContent = buildTemplateLearningContent(topic);
  const learningProcess = buildTemplateLearningProcess(topic);
  const assessment = topic.assessmentMethods || '';

  return {
    ...baseFields,
    essentialConcept: keepExisting(baseFields.essentialConcept, topic.learningContent),
    objectiveK: keepExisting(baseFields.objectiveK, topic.objectiveK),
    objectiveP: keepExisting(baseFields.objectiveP, topic.objectiveP),
    objectiveA: keepExisting(baseFields.objectiveA, topic.objectiveA),
    learningContent: keepExisting(baseFields.learningContent, learningContent),
    competencies: keepExisting(baseFields.competencies, topic.competencies),
    skills21: keepExisting(baseFields.skills21, topic.skills21),
    learningProcess: keepExisting(baseFields.learningProcess, learningProcess),
    tasks: keepExisting(baseFields.tasks, topic.highlightActivity ? `- ${topic.highlightActivity}` : ''),
    measureK: keepExisting(baseFields.measureK, topic.objectiveK),
    measureP: keepExisting(baseFields.measureP, topic.objectiveP),
    measureA: keepExisting(baseFields.measureA, topic.objectiveA),
    methodK: keepExisting(baseFields.methodK, assessment),
    methodP: keepExisting(baseFields.methodP, assessment),
    methodA: keepExisting(baseFields.methodA, assessment),
    toolK: keepExisting(baseFields.toolK, assessment),
    toolP: keepExisting(baseFields.toolP, assessment),
    toolA: keepExisting(baseFields.toolA, assessment),
  };
};

export default function PlanForm({ planId, isAdmin = false }: PlanFormProps) {
  const router = useRouter();
  const isEdit = !!planId;

  // Loading & UI States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Phase 3: AI Draft & Hallucination States
  const [isAiDraft, setIsAiDraft] = useState(false);
  const [aiValidation, setAiValidation] = useState<any>(null);
  
  const [activeTab, setActiveTab] = useState(1);
  const [initialData, setInitialData] = useState<any>(null);
  
  // ── Hardcoded Curriculum Selection State ──
  const [selectedCurriculum, setSelectedCurriculum] = useState<SubjectCurriculumData | null>(null);
  const [curriculumGrade, setCurriculumGrade] = useState<string>('');
  const [curriculumLearningArea, setCurriculumLearningArea] = useState<string>('');
  const [showCurriculumPanel, setShowCurriculumPanel] = useState(false);
  
  // Backups modal state (only for Edit Mode)
  const [showBackupReason, setShowBackupReason] = useState(false);
  const [backupReasonText, setBackupReasonText] = useState('แก้ไขรายละเอียดทั่วไป');

  // คลังซ่อน/แสดง (Collapsible Library Panels) สำหรับ Tab 4
  const [showMethodLib, setShowMethodLib] = useState(false);
  const [showToolLib, setShowToolLib] = useState(false);
  const [showMethodLibP, setShowMethodLibP] = useState(false);
  const [showToolLibP, setShowToolLibP] = useState(false);
  const [showMethodLibA, setShowMethodLibA] = useState(false);
  const [showToolLibA, setShowToolLibA] = useState(false);
  
  // คลังซ่อน/แสดง (Collapsible Library Panels) สำหรับ Tab 3 (จุดประสงค์ และสื่อ/ชิ้นงาน)
  const [showObjK, setShowObjK] = useState(false);
  const [showObjP, setShowObjP] = useState(false);
  const [showObjA, setShowObjA] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [showTask, setShowTask] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: 'success' | 'info' | 'error' }>({
    show: false,
    msg: '',
    type: 'info'
  });

  const triggerToast = (msg: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ show: true, msg, type });
    setTimeout(() => {
      setToast(t => ({ ...t, show: false }));
    }, 3000);
  };

  // 19+ Document fields states
  const [fields, setFields] = useState<Record<string, any>>({
    planStatus: 'draft',
    teacherName: '',
    schoolName: '',
    organization: '',
    headerLearningArea: '',
    headerGradeLevel: '',
    
    subjectId: '',
    subjectName: '',
    subjectCode: '',
    learningArea: '',
    gradeLevel: '',
    semester: '1',
    academicYear: '2569',
    totalHours: 2,
    
    unitId: '',
    unitName: '',
    topicId: '',
    lessonTopic: '',
    
    learningStandard: '',
    indicatorDuring: '',
    indicatorFinal: '',
    indicatorSelectedIds: '',
    essentialConcept: '',
    objectiveK: '',
    objectiveP: '',
    objectiveA: '',
    learningContent: '',
    competencies: '',
    desiredAttributes: '',
    skills21: '',
    learningProcess: '',
    
    measureK: '', methodK: '', toolK: '', criteriaK: 'ผ่านเกณฑ์ร้อยละ 60 ขึ้นไป', rubricK: '',
    measureP: '', methodP: '', toolP: '', criteriaP: 'ผ่านเกณฑ์ระดับคุณภาพระดับดีขึ้นไป', rubricP: '',
    measureA: '', methodA: '', toolA: '', criteriaA: 'ผ่านเกณฑ์ระดับคุณภาพระดับดีขึ้นไป', rubricA: '',
    
    learningMedia: '',
    learningSources: '',
    tasks: '',
    
    resultK: '',
    resultP: '',
    resultA: '',
    problems: '',
    solutions: ''
  });

  // Load configuration & master data
  useEffect(() => {
    async function fetchData() {
      try {
        const initRes = await fetch('/api/initial-data');
        const initJson = await initRes.json();
        
        if (initJson.success) {
          setInitialData(initJson.data);
        }

        // If Edit Mode, load existing plan data
        if (isEdit) {
          const planRes = await fetch(`/api/plans/${planId}`);
          const planJson = await planRes.json();
          if (planJson.success) {
            const planData = planJson.data;
            const cleanedData: Record<string, any> = {};
            const bulletFields = ['competencies', 'desiredAttributes', 'skills21', 'learningMedia', 'learningSources', 'tasks'];
            
            const FIELD_KEYS = [
              'planStatus', 'teacherName', 'schoolName', 'organization', 'headerLearningArea', 'headerGradeLevel',
              'subjectId', 'subjectName', 'subjectCode', 'learningArea', 'gradeLevel', 'semester', 'academicYear', 'totalHours',
              'unitId', 'unitName', 'topicId', 'lessonTopic',
              'learningStandard', 'indicatorDuring', 'indicatorFinal', 'indicatorSelectedIds', 'essentialConcept',
              'objectiveK', 'objectiveP', 'objectiveA', 'learningContent', 'competencies', 'desiredAttributes', 'skills21', 'learningProcess',
              'measureK', 'methodK', 'toolK', 'criteriaK', 'rubricK',
              'measureP', 'methodP', 'toolP', 'criteriaP', 'rubricP',
              'measureA', 'methodA', 'toolA', 'criteriaA', 'rubricA',
              'learningMedia', 'learningSources', 'tasks',
              'resultK', 'resultP', 'resultA', 'problems', 'solutions'
            ];

            // Merge loaded data with defaults, converting nulls/undefineds to safe default values
            FIELD_KEYS.forEach(key => {
              const val = planData[key];
              if (val === undefined || val === null) {
                if (key === 'criteriaK') cleanedData[key] = 'ผ่านเกณฑ์ร้อยละ 60 ขึ้นไป';
                else if (key === 'criteriaP' || key === 'criteriaA') cleanedData[key] = 'ผ่านเกณฑ์ระดับคุณภาพระดับดีขึ้นไป';
                else if (key === 'semester') cleanedData[key] = '1';
                else if (key === 'academicYear') cleanedData[key] = '2569';
                else if (key === 'totalHours') cleanedData[key] = 2;
                else if (key === 'planStatus') cleanedData[key] = 'draft';
                else cleanedData[key] = '';
              } else if (typeof val === 'string') {
                if (bulletFields.includes(key)) {
                  cleanedData[key] = ensureBulletString(val);
                } else {
                  cleanedData[key] = cleanJSONString(val);
                }
              } else {
                cleanedData[key] = val;
              }
            });
            setFields(cleanedData);
          } else {
            triggerToast('ไม่พบรหัสแผนการสอนนี้', 'error');
            router.push('/');
          }
        }
      } catch (err: any) {
        triggerToast('เกิดข้อผิดพลาดในการดึงข้อมูลระบบ', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [planId, isEdit, router]);

  // Master lists
  const subjects = initialData?.subjects || [];
  const units = initialData?.units || [];
  const topics = initialData?.topics || [];
  const indicators = initialData?.indicators || [];
  const options = initialData?.options || {};

  useEffect(() => {
    setFields(prev => {
      const synced = withSyncedAssessmentMeasures(prev);
      if (
        synced.measureK === prev.measureK &&
        synced.measureP === prev.measureP &&
        synced.measureA === prev.measureA
      ) {
        return prev;
      }
      return synced;
    });
  }, [fields.objectiveK, fields.objectiveP, fields.objectiveA]);

  const handleAssessmentChoice = (fieldName: string, choice: string, mode: 'append' | 'replace' = 'append') => {
    setFields(prev => {
      if (mode === 'replace') {
        return { ...prev, [fieldName]: choice };
      }

      const currentItems = splitAssessmentChoices(prev[fieldName]);
      const updatedItems = currentItems.includes(choice)
        ? currentItems.filter(item => item !== choice)
        : [...currentItems, choice];

      return { ...prev, [fieldName]: updatedItems.join('; ') };
    });
  };

  const renderAssessmentChoiceDropdown = (
    domain: AssessmentDomain,
    choiceField: AssessmentChoiceField,
    targetField: string,
    placeholder: string,
    mode: 'append' | 'replace' = 'append'
  ) => {
    const dropdownOptions = buildAssessmentChoiceOptions(
      options.assessmentTemplate || [],
      domain,
      choiceField,
      fields[targetField]
    );

    if (!dropdownOptions.length) return null;

    return (
      <SmartDropdown
        options={dropdownOptions}
        placeholder={placeholder}
        onSelect={(opt) => handleAssessmentChoice(targetField, opt.label, mode)}
      />
    );
  };

  // Filters based on selections
  const gradeLevels = Array.from(new Set(subjects.map((s: any) => normalizeGradeLevel(s.gradeLevel)).filter(Boolean)));
  const subjectsForSelectedGrade = fields.gradeLevel
    ? subjects.filter((s: any) => gradeLevelMatches(s.gradeLevel, fields.gradeLevel))
    : subjects;
  const defaultSubjectForGrade =
    subjectsForSelectedGrade.find((s: any) => s.courseType === 'พื้นฐาน' && String(s.semester || '') === String(fields.semester || '')) ||
    subjectsForSelectedGrade.find((s: any) => s.courseType === 'พื้นฐาน') ||
    subjectsForSelectedGrade[0];
  const activeSubjectId = fields.subjectId || defaultSubjectForGrade?.subjectId || '';

  const filteredUnits = activeSubjectId 
    ? units.filter((u: any) => u.subjectId === activeSubjectId)
    : [];
    
  const filteredTopics = fields.unitId 
    ? topics.filter((t: any) => t.unitId === fields.unitId)
    : [];

  const filteredUnitIds = new Set(filteredUnits.map((u: any) => u.unitId));
  const quickTopicSubjectId = activeSubjectId;
  const eflQuickUnitIds = new Set(
    units
      .filter((u: any) => u.subjectId === quickTopicSubjectId && u.source === 'efl-context-template')
      .map((u: any) => u.unitId)
  );
  const eflQuickTopics = quickTopicSubjectId
    ? topics.filter((t: any) => t.source === 'efl-context-template' && eflQuickUnitIds.has(t.unitId))
    : [];

  const filteredIndicators = fields.gradeLevel
    ? indicators.filter((ind: any) => ind.gradeLevel === fields.gradeLevel)
    : [];

  // ── Hardcoded Curriculum Computed Lists ──
  const hardcodedGradeLevels = getAllGradeLevels();
  const hardcodedSubjectsForGrade = curriculumGrade ? getSubjectsByGrade(curriculumGrade) : [];
  
  const hardcodedLearningAreasForGrade = Array.from(new Set(hardcodedSubjectsForGrade.map(s => s.learningArea)));
  const hardcodedSubjectsForGradeArea = hardcodedSubjectsForGrade.filter(s => 
    curriculumLearningArea ? s.learningArea === curriculumLearningArea : true
  );

  // ── Handlers: Hardcoded Curriculum ──
  const handleCurriculumGradeChange = (grade: string) => {
    setCurriculumGrade(grade);
    setCurriculumLearningArea('');
    setSelectedCurriculum(null);
  };

  const handleCurriculumSubjectSelect = (curriculum: SubjectCurriculumData) => {
    setSelectedCurriculum(curriculum);
  };

  const handleApplyCurriculum = () => {
    if (!selectedCurriculum) return;
    const standards = formatStandards(selectedCurriculum);
    const duringInds = formatDuringIndicators(selectedCurriculum);
    const finalInds = formatFinalIndicators(selectedCurriculum);

    setFields(prev => ({
      ...prev,
      subjectName: prev.subjectName || selectedCurriculum.subjectName,
      subjectCode: prev.subjectCode || selectedCurriculum.subjectCode,
      gradeLevel: prev.gradeLevel || selectedCurriculum.gradeLevel,
      headerGradeLevel: prev.headerGradeLevel || toHeaderGradeLevel(selectedCurriculum.gradeLevel),
      learningArea: selectedCurriculum.learningArea,
      headerLearningArea: selectedCurriculum.learningArea,
      learningStandard: standards,
      indicatorDuring: duringInds,
      indicatorFinal: finalInds,
      indicatorSelectedIds: selectedCurriculum.indicators.map(i => i.id).join(','),
    }));
    setShowCurriculumPanel(false);
    triggerToast(`โหลดมาตรฐานและตัวชี้วัดวิชา "${selectedCurriculum.subjectName} ${selectedCurriculum.gradeLevel}" เรียบร้อยแล้ว!`, 'success');
  };

  const handleAddSingleIndicator = (curriculum: SubjectCurriculumData, indicatorId: string) => {
    const indicator = curriculum.indicators.find(i => i.id === indicatorId);
    if (!indicator) return;
    const indicatorText = `${indicator.code} ${indicator.text}`;
    const field = indicator.type === 'during' ? 'indicatorDuring' : 'indicatorFinal';
    setFields(prev => {
      const current = prev[field] || '';
      if (current.includes(indicatorText)) {
        // Remove it
        return { ...prev, [field]: current.split('\n').filter((l: string) => l.trim() !== indicatorText).join('\n') };
      }
      return { ...prev, [field]: current ? `${current}\n${indicatorText}` : indicatorText };
    });
  };

  // 1. Select Subject Handler
  const handleGradeChange = (gradeLevel: string) => {
    const normalizedGradeLevel = normalizeGradeLevel(gradeLevel);
    setFields(prev => ({
      ...prev,
      gradeLevel: normalizedGradeLevel,
      headerGradeLevel: toHeaderGradeLevel(normalizedGradeLevel),
      subjectId: '',
      subjectCode: '',
      subjectName: '',
      unitId: '',
      unitName: '',
      topicId: '',
      lessonTopic: '',
      totalHours: 2,
      indicatorSelectedIds: ''
    }));
  };

  const handleSubjectChange = (subjectId: string) => {
    const selected = subjects.find((s: any) => s.subjectId === subjectId);
    if (selected) {
      setFields(prev => ({
        ...prev,
        subjectId,
        subjectCode: selected.subjectCode,
        subjectName: selected.subjectName,
        gradeLevel: normalizeGradeLevel(selected.gradeLevel),
        headerGradeLevel: toHeaderGradeLevel(selected.gradeLevel),
        learningArea: selected.learningArea,
        // Reset subsequent selections
        unitId: '',
        unitName: '',
        topicId: '',
        lessonTopic: '',
        totalHours: 2,
        indicatorSelectedIds: ''
      }));
    }
  };

  // 2. Select / Type Unit Handler (Automaps indicators associated with this unit if matched)
  const handleUnitNameChange = (typedName: string) => {
    const unitCandidates = activeSubjectId ? filteredUnits : units;
    const selected = unitCandidates.find((u: any) => 
      u.unitName === typedName || 
      `หน่วยที่ ${u.unitNumber}: ${u.unitName}` === typedName
    ) || units.find((u: any) => 
      u.unitName === typedName || 
      `หน่วยที่ ${u.unitNumber}: ${u.unitName}` === typedName
    );

    if (selected) {
      // Find indicators matching the mapped IDs in unit
      const associatedIds = selected.indicatorIds ? selected.indicatorIds.split(',') : [];
      const matchedInds = indicators.filter((ind: any) => associatedIds.includes(ind.indicatorId));
      
      const duringList = matchedInds.filter((ind: any) => ind.indicatorType === 'during').map((ind: any) => `${ind.indicatorCode} ${ind.indicatorText}`).join('\n');
      const finalList = matchedInds.filter((ind: any) => ind.indicatorType === 'final').map((ind: any) => `${ind.indicatorCode} ${ind.indicatorText}`).join('\n');
      const uniqueStandards = Array.from(new Set(matchedInds.map((ind: any) => `${ind.standardCode} ${ind.standardText}`))).join('\n');

      setFields(prev => ({
        ...prev,
        unitId: selected.unitId,
        unitName: selected.unitName,
        indicatorSelectedIds: selected.indicatorIds || '',
        indicatorDuring: duringList,
        indicatorFinal: finalList,
        learningStandard: uniqueStandards,
        // Reset topic
        topicId: '',
        lessonTopic: '',
        totalHours: 2
      }));
    } else {
      // Custom unit name typed by teacher
      setFields(prev => ({
        ...prev,
        unitId: '',
        unitName: typedName
      }));
    }
  };

  // 3. Select / Type Topic Handler
  const handleTopicNameChange = (typedTopic: string) => {
    const topicCandidates = fields.unitId
      ? filteredTopics
      : eflQuickTopics.length > 0
        ? eflQuickTopics
        : topics;
    const selected = topicCandidates.find((t: any) => 
      t.lessonTopic === typedTopic || 
      `${t.topicNumber}. ${t.lessonTopic}` === typedTopic
    ) || topics.find((t: any) => 
      t.lessonTopic === typedTopic || 
      `${t.topicNumber}. ${t.lessonTopic}` === typedTopic
    );

    if (selected) {
      const selectedUnit = units.find((u: any) => u.unitId === selected.unitId);
      const selectedSubject = subjects.find((s: any) => s.subjectId === selectedUnit?.subjectId);

      setFields(prev => ({
        ...applyTopicTemplateDefaults({
          ...prev,
          subjectId: prev.subjectId || selectedSubject?.subjectId || '',
          subjectCode: prev.subjectCode || selectedSubject?.subjectCode || '',
          subjectName: prev.subjectName || selectedSubject?.subjectName || '',
          gradeLevel: prev.gradeLevel || normalizeGradeLevel(selectedSubject?.gradeLevel) || '',
          headerGradeLevel: prev.headerGradeLevel || toHeaderGradeLevel(selectedSubject?.gradeLevel || prev.gradeLevel),
          learningArea: prev.learningArea || selectedSubject?.learningArea || '',
          unitId: prev.unitId || selected.unitId || '',
          unitName: prev.unitName || selectedUnit?.unitName || '',
          topicId: selected.topicId,
          lessonTopic: selected.lessonTopic,
          totalHours: selected.defaultHours || 2
        }, selected)
      }));
    } else {
      // Custom topic name typed by teacher
      setFields(prev => ({
        ...prev,
        topicId: '',
        lessonTopic: typedTopic
      }));
    }
  };

  const handleEflQuickTopicChange = (topicId: string) => {
    if (!topicId) return;

    const selected = eflQuickTopics.find((t: any) => t.topicId === topicId);
    if (!selected) return;

    const selectedUnit = units.find((u: any) => u.unitId === selected.unitId);
    const selectedSubject = subjects.find((s: any) => s.subjectId === selectedUnit?.subjectId);

    setFields(prev => ({
      ...applyTopicTemplateDefaults({
        ...prev,
        subjectId: prev.subjectId || selectedSubject?.subjectId || '',
        subjectCode: prev.subjectCode || selectedSubject?.subjectCode || '',
        subjectName: prev.subjectName || selectedSubject?.subjectName || '',
        gradeLevel: prev.gradeLevel || normalizeGradeLevel(selectedSubject?.gradeLevel) || '',
        headerGradeLevel: prev.headerGradeLevel || toHeaderGradeLevel(selectedSubject?.gradeLevel),
        learningArea: prev.learningArea || selectedSubject?.learningArea || '',
        unitId: selectedUnit?.unitId || selected.unitId || '',
        unitName: selectedUnit?.unitName || prev.unitName || '',
        topicId: selected.topicId,
        lessonTopic: selected.lessonTopic,
        totalHours: selected.defaultHours || 2,
        indicatorSelectedIds: selectedUnit?.indicatorIds || prev.indicatorSelectedIds || '',
      }, selected)
    }));

    triggerToast(`เลือกหัวข้อ "${selected.lessonTopic}" และเติมข้อมูลตั้งต้นแล้ว`, 'success');
  };

  // 4. Update Indicators Checkboxes Check Handler
  const handleIndicatorCheck = (indId: string, checked: boolean) => {
    let selectedArr = fields.indicatorSelectedIds ? fields.indicatorSelectedIds.split(',') : [];
    if (checked) {
      if (!selectedArr.includes(indId)) selectedArr.push(indId);
    } else {
      selectedArr = selectedArr.filter((id: string) => id !== indId);
    }
    
    // Recompute values for textareas
    const updatedIds = selectedArr.join(',');
    const matchedInds = indicators.filter((ind: any) => selectedArr.includes(ind.indicatorId));
    
    const duringList = matchedInds.filter((ind: any) => ind.indicatorType === 'during').map((ind: any) => `${ind.indicatorCode} ${ind.indicatorText}`).join('\n');
    const finalList = matchedInds.filter((ind: any) => ind.indicatorType === 'final').map((ind: any) => `${ind.indicatorCode} ${ind.indicatorText}`).join('\n');
    const uniqueStandards = Array.from(new Set(matchedInds.map((ind: any) => `${ind.standardCode} ${ind.standardText}`))).join('\n');

    setFields(prev => ({
      ...prev,
      indicatorSelectedIds: updatedIds,
      indicatorDuring: duringList,
      indicatorFinal: finalList,
      learningStandard: uniqueStandards
    }));
  };

  // 5. Add / Remove options chips to text fields
  const handleChipClick = (fieldName: string, optionText: string) => {
    const currentVal = fields[fieldName] || '';
    const currentItems = currentVal.split('\n').map((i: string) => i.trim()).filter(Boolean);
    const chipText = `- ${optionText}`;
    
    if (currentItems.includes(chipText)) {
      // Remove
      const filtered = currentItems.filter((i: string) => i !== chipText);
      setFields(prev => ({ ...prev, [fieldName]: filtered.join('\n') }));
    } else {
      // Add
      currentItems.push(chipText);
      setFields(prev => ({ ...prev, [fieldName]: currentItems.join('\n') }));
    }
  };

  // 6. Gemini AI Magic Autofill Handler
  const handleAIMagicFill = async () => {
    if (!fields.gradeLevel || !fields.subjectName || !fields.lessonTopic) {
      triggerToast('กรุณาระบุ ระดับชั้น, วิชา และ เรื่องที่สอน ก่อนใช้ระบบ AI', 'error');
      return;
    }

    setAiLoading(true);
    triggerToast('Gemini AI กำลังวิเคราะห์หลักสูตรและจัดทำร่างแผน...', 'info');

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gradeLevel: fields.gradeLevel,
          subjectName: fields.subjectName,
          lessonTopic: fields.lessonTopic,
          learningStandard: fields.learningStandard,
          indicatorDuring: fields.indicatorDuring,
          indicatorFinal: fields.indicatorFinal
        })
      });

      let json;
      try {
        json = await response.json();
      } catch (parseError) {
        throw new Error('ไม่สามารถอ่านข้อมูลที่ตอบกลับมาจาก AI ได้ (กรุณาลองใหม่อีกครั้ง)');
      }
      if (json.success && json.data) {
        const ai = json.data;
        
        // Auto populate all generated 19 fields, sanitizing JSON characters and formatting lists
        setFields(prev => ({
          ...prev,
          learningStandard: cleanJSONString(ai.learningStandard) || prev.learningStandard,
          indicatorDuring: cleanJSONString(ai.indicatorDuring) || prev.indicatorDuring,
          indicatorFinal: cleanJSONString(ai.indicatorFinal) || prev.indicatorFinal,
          essentialConcept: cleanJSONString(ai.essentialConcept) || prev.essentialConcept,
          objectiveK: cleanJSONString(ai.objectiveK) || prev.objectiveK,
          objectiveP: cleanJSONString(ai.objectiveP) || prev.objectiveP,
          objectiveA: cleanJSONString(ai.objectiveA) || prev.objectiveA,
          learningContent: cleanJSONString(ai.learningContent) || prev.learningContent,
          competencies: ensureBulletString(ai.competencies) || prev.competencies,
          desiredAttributes: ensureBulletString(ai.desiredAttributes) || prev.desiredAttributes,
          skills21: ensureBulletString(ai.skills21) || prev.skills21,
          learningMedia: ensureBulletString(ai.learningMedia) || prev.learningMedia,
          learningSources: ensureBulletString(ai.learningSources) || prev.learningSources,
          tasks: ensureBulletString(ai.tasks) || prev.tasks,
          learningProcess: cleanJSONString(ai.learningProcess) || prev.learningProcess,
          
          measureK: cleanJSONString(ai.objectiveK) || prev.measureK,
          methodK: cleanJSONString(ai.methodK) || prev.methodK,
          toolK: cleanJSONString(ai.toolK) || prev.toolK,
          criteriaK: cleanJSONString(ai.criteriaK) || prev.criteriaK,
          rubricK: cleanJSONString(ai.rubricK) || prev.rubricK,
          
          measureP: cleanJSONString(ai.objectiveP) || prev.measureP,
          methodP: cleanJSONString(ai.methodP) || prev.methodP,
          toolP: cleanJSONString(ai.toolP) || prev.toolP,
          criteriaP: cleanJSONString(ai.criteriaP) || prev.criteriaP,
          rubricP: cleanJSONString(ai.rubricP) || prev.rubricP,
          
          measureA: cleanJSONString(ai.objectiveA) || prev.measureA,
          methodA: cleanJSONString(ai.methodA) || prev.methodA,
          toolA: cleanJSONString(ai.toolA) || prev.toolA,
          criteriaA: cleanJSONString(ai.criteriaA) || prev.criteriaA,
          rubricA: cleanJSONString(ai.rubricA) || prev.rubricA,
          
          resultK: cleanJSONString(ai.resultK) || prev.resultK,
          resultP: cleanJSONString(ai.resultP) || prev.resultP,
          resultA: cleanJSONString(ai.resultA) || prev.resultA,
          problems: cleanJSONString(ai.problems) || prev.problems,
          solutions: cleanJSONString(ai.solutions) || prev.solutions
        }));
        
        setIsAiDraft(ai.isAiDraft || true);
        if (ai.aiValidation) {
          setAiValidation(ai.aiValidation);
        }

        triggerToast('AI ทำร่างแผนการสอนเสร็จสมบูรณ์แล้ว!', 'success');
        setActiveTab(2); // Auto jump to review tab

      } else {
        triggerToast('AI ล้มเหลว: ' + (json.error || 'กรุณาลองใหม่อีกครั้ง'), 'error');
      }
    } catch (err: any) {
      triggerToast('ล้มเหลวในการเชื่อมต่อกับ AI: ' + err.message, 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!planId) return;
    const confirmed = window.confirm('คุณแน่ใจหรือไม่ว่าต้องการเก็บถาวรแผนการจัดการเรียนรู้นี้? แผนจะถูกซ่อนจากหน้ารายการ แต่ยังเก็บข้อมูลและประวัติสำรองไว้ในระบบ');
    if (!confirmed) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/plans/${planId}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        triggerToast('เก็บถาวรแผนการสอนสำเร็จแล้ว', 'success');
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        triggerToast('เกิดข้อผิดพลาด: ' + json.error, 'error');
      }
    } catch (err: any) {
      triggerToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // 7. Save to Database Handler
  const handleSave = async (status: 'draft' | 'complete') => {
    if (!fields.lessonTopic || !fields.subjectName) {
      triggerToast('กรุณาระบุ เรื่องที่สอน และ วิชา ก่อนทำการบันทึก', 'error');
      return;
    }

    if (isEdit) {
      // Edit Mode -> open reason dialog first
      fields.planStatus = status;
      setShowBackupReason(true);
    } else {
      // Create Mode -> POST direct
      setSaving(true);
      try {
        const payload = {
          ...getCleanedPayload(withSyncedAssessmentMeasures(fields)),
          planStatus: status
        };
        const res = await fetch('/api/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        
        if (json.success) {
          triggerToast('บันทึกแผนการสอนใหม่เรียบร้อยแล้ว', 'success');
          setTimeout(() => {
            router.push('/');
            router.refresh();
          }, 1500);
        } else {
          triggerToast('ไม่สามารถบันทึกข้อมูล: ' + json.error, 'error');
        }
      } catch (err: any) {
        triggerToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      } finally {
        setSaving(false);
      }
    }
  };

  // Confirm revision update in edit mode (includes reasons logging)
  const confirmUpdate = async () => {
    setShowBackupReason(false);
    setSaving(true);
    
    try {
      const payload = {
        ...getCleanedPayload(withSyncedAssessmentMeasures(fields)),
        backupReason: backupReasonText
      };
      
      const res = await fetch(`/api/plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      
      if (json.success) {
        triggerToast('อัปเดตรายละเอียดแผนการสอนและสำรองข้อมูลรุ่นเก่าเรียบร้อยแล้ว', 'success');
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 1500);
      } else {
        triggerToast('ไม่สามารถบันทึกข้อมูล: ' + json.error, 'error');
      }
    } catch (err: any) {
      triggerToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '14px', fontFamily: 'Sarabun, sans-serif' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid rgba(0,0,0,0.1)', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <strong>กำลังดึงโครงสร้างแผนการสอน...</strong>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="page">
      {/* ─── TOAST NOTIFICATION ─── */}
      {toast.show && (
        <div className={`toast toast-${toast.type}`} style={{ borderLeftColor: toast.type === 'success' ? '#16a34a' : toast.type === 'error' ? '#dc2626' : '#6366f1' }}>
          {toast.msg}
        </div>
      )}

      {/* ─── ACTION BAR ─── */}
      <div className="action-bar no-print">
        <button className="btn btn-ghost" onClick={() => router.push('/')}>
          <ArrowLeft size={14} /> กลับหน้าแดชบอร์ด
        </button>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isEdit && (
            <>
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={handleArchive}
                disabled={saving || aiLoading}
              >
                เก็บถาวรแผน
              </button>
              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={() => window.open(`/plan/${planId}/preview`, '_blank')}
                title="ดูตัวอย่างแผน"
                style={{ borderColor: 'var(--c-primary)', color: 'var(--c-primary)' }}
              >
                👁️ ดูตัวอย่างแผน (Preview)
              </button>
            </>
          )}
          <button 
            type="button" 
            className="btn btn-success" 
            onClick={() => handleSave('complete')}
            disabled={saving || aiLoading}
          >
            <Save size={14} /> บันทึกเสร็จสมบูรณ์
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={() => handleSave('draft')}
            disabled={saving || aiLoading}
          >
            <Save size={14} /> บันทึกแบบร่าง (Draft)
          </button>
        </div>
      </div>

      {/* ─── PHASE 3: AI DRAFT WARNING BANNER ─── */}
      {isAiDraft && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-amber-500 text-xl animate-pulse">✨</div>
            <div className="flex-1">
              <h3 className="font-bold text-amber-800 flex items-center gap-2">
                ฉบับร่างจาก AI - กรุณาตรวจสอบและปรับแก้
                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                  AI Assistant
                </span>
              </h3>
              <p className="mt-1 text-sm text-amber-700">
                ข้อมูลในแผนนี้ถูกสร้างโดย AI โปรดอ่านทบทวนเนื้อหา กิจกรรม และเกณฑ์การประเมินอีกครั้งเพื่อความถูกต้องและเหมาะสมกับบริบทชั้นเรียนของคุณครู ก่อนกดปุ่ม "บันทึกเสร็จสมบูรณ์"
              </p>

              {aiValidation && !aiValidation.isValid && (
                <div className="mt-3 rounded-md bg-red-50 p-3 border border-red-100">
                  <p className="text-sm font-semibold text-red-800 mb-1 flex items-center gap-1">
                    <span className="text-red-500">⚠️</span> ตรวจพบตัวชี้วัดที่อาจไม่ตรงกับหลักสูตรแกนกลาง (AI หลอน):
                  </p>
                  <ul className="list-disc list-inside text-sm text-red-700 ml-1">
                    {aiValidation.hallucinatedIndicators.map((ind: string, idx: number) => (
                      <li key={idx}><span className="font-mono bg-red-100 px-1 py-0.5 rounded">{ind}</span></li>
                    ))}
                  </ul>
                  <p className="text-xs text-red-600 mt-2">กรุณาตรวจสอบรหัสตัวชี้วัดเหล่านี้กับเอกสารอ้างอิงอีกครั้ง</p>
                </div>
              )}
            </div>
            <button 
              onClick={() => setIsAiDraft(false)}
              className="text-amber-400 hover:text-amber-600 transition-colors p-1"
              title="รับทราบ"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ─── WIZARD FORM CARDS ─── */}
      <form onSubmit={e => e.preventDefault()} style={{ position: 'relative' }}>
        
        {/* Form Tabs Navigation */}
        <div className="form-tabs">
          <button type="button" className={`form-tab ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)}>1. ข้อมูลวิชาและรายคาบ</button>
          <button type="button" className={`form-tab ${activeTab === 2 ? 'active' : ''}`} onClick={() => setActiveTab(2)}>2. สาระสำคัญและตัวชี้วัด (ข้อ 1-4)</button>
          <button type="button" className={`form-tab ${activeTab === 3 ? 'active' : ''}`} onClick={() => setActiveTab(3)}>3. จุดประสงค์และเนื้อหา (ข้อ 5-7)</button>
          <button type="button" className={`form-tab ${activeTab === 4 ? 'active' : ''}`} onClick={() => setActiveTab(4)}>4. กระบวนการและการวัดผล (ข้อ 8-9)</button>
          <button type="button" className={`form-tab ${activeTab === 5 ? 'active' : ''}`} onClick={() => setActiveTab(5)}>5. บันทึกหลังสอน (ข้อ 10)</button>
        </div>

        {/* ─── TAB 1: BASIC INFO ─── */}
        {activeTab === 1 && (
          <div className="tab-panel card">
            <h3>ข้อมูลวิชาเบื้องต้น และ ผู้ใช้งาน</h3>
            <div className="g3">
              <label className="field">
                ชื่อ-นามสกุลผู้สอน
                <input value={fields.teacherName} onChange={e => setFields({ ...fields, teacherName: e.target.value })} required />
              </label>
              <label className="field">
                โรงเรียน
                <input value={fields.schoolName} onChange={e => setFields({ ...fields, schoolName: e.target.value })} required />
              </label>
              <label className="field">
                หน่วยงานสังกัด
                <input value={fields.organization} onChange={e => setFields({ ...fields, organization: e.target.value })} required />
              </label>
            </div>

            <hr className="divider" style={{ borderTopStyle: 'dashed' }} />
            
            <h3>รายวิชาและหัวข้อสอน</h3>


            <div className="g3">
              <label className="field">
                เลือกระดับชั้น
                <select value={fields.gradeLevel} onChange={e => handleGradeChange(e.target.value)}>
                  <option value="">-- เลือกระดับชั้น --</option>
                  {gradeLevels.map((grade: any) => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                เลือกวิชา (เฉพาะ 8 กลุ่มสาระหลัก)
                <select 
                  value={fields.subjectName || ''}
                  onChange={e => {
                    const subjName = e.target.value;
                    if (!subjName) {
                      setFields(prev => ({ ...prev, subjectName: '', subjectCode: '', subjectId: '' }));
                      return;
                    }
                    if (fields.gradeLevel) {
                      const subjects = getSubjectsByGrade(fields.gradeLevel);
                      const selected = subjects.find(s => s.subjectName === subjName);
                      if (selected) {
                        setFields(prev => ({ 
                          ...prev, 
                          subjectName: subjName, 
                          subjectCode: selected.subjectCode,
                          subjectId: selected.subjectKey // used for unit filtering if needed
                        }));
                      } else {
                        setFields(prev => ({ ...prev, subjectName: subjName, subjectCode: '', subjectId: '' }));
                      }
                    } else {
                      setFields(prev => ({ ...prev, subjectName: subjName }));
                    }
                  }}
                  disabled={!fields.gradeLevel}
                >
                  <option value="">-- เลือกวิชา --</option>
                  {fields.gradeLevel && getSubjectsByGrade(fields.gradeLevel).map((s: any) => (
                    <option key={s.subjectKey} value={s.subjectName}>{s.subjectName}</option>
                  ))}
                </select>
              </label>

              {/* Removed redundant subjectName input since we combined it with datalist */}

              <label className="field">
                รหัสวิชา (แสดงในหัวกระดาษ)
                <input value={fields.subjectCode} onChange={e => setFields({ ...fields, subjectCode: e.target.value })} required />
              </label>
            </div>

            <div className="g3" style={{ marginTop: '12px' }}>
              <label className="field">
                ภาคเรียน
                <select value={fields.semester} onChange={e => setFields({ ...fields, semester: e.target.value })}>
                  <option value="1">1</option>
                  <option value="2">2</option>
                </select>
              </label>
              <label className="field">
                ปีการศึกษา
                <input value={fields.academicYear} onChange={e => setFields({ ...fields, academicYear: e.target.value })} />
              </label>
              <label className="field">
                จำนวนชั่วโมงสอนของแผนนี้
                <input type="number" value={fields.totalHours} onChange={e => setFields({ ...fields, totalHours: parseInt(e.target.value) || 2 })} />
              </label>
            </div>

            <div className="g2" style={{ marginTop: '12px' }}>
              <label className="field">
                {isAdmin ? 'ระบุหน่วยการเรียนรู้ (พิมพ์เอง หรือ เลือกแนะนำ)' : 'ระบุหน่วยการเรียนรู้'}
                <input 
                  type="text"
                  list={isAdmin ? "units-datalist" : undefined}
                  value={fields.unitName || ''} 
                  onChange={e => handleUnitNameChange(e.target.value)}
                  disabled={!activeSubjectId}
                  placeholder={isAdmin ? (activeSubjectId ? "พิมพ์ชื่อหน่วย หรือเลือกจากรายการ..." : "กรุณาเลือกวิชาก่อน") : "พิมพ์ชื่อหน่วยการเรียนรู้"}
                />
                {isAdmin && (
                  <datalist id="units-datalist">
                    {filteredUnits.map((u: any) => (
                      <option key={u.unitId} value={`หน่วยที่ ${u.unitNumber}: ${u.unitName}`} />
                    ))}
                  </datalist>
                )}
              </label>

              <label className="field">
                {isAdmin ? 'ระบุเรื่องที่สอน (พิมพ์เอง หรือ เลือกแนะนำ)' : 'ระบุเรื่องที่สอน'}
                <input 
                  type="text"
                  list={isAdmin ? "topics-datalist" : undefined}
                  value={fields.lessonTopic || ''} 
                  onChange={e => handleTopicNameChange(e.target.value)}
                  disabled={!activeSubjectId}
                  placeholder={isAdmin ? (activeSubjectId ? "พิมพ์ชื่อเรื่อง หรือเลือกจากรายการ..." : "กรุณาเลือกวิชาก่อน") : "พิมพ์ชื่อเรื่องที่สอน"}
                />
                {isAdmin && (
                  <datalist id="topics-datalist">
                    {(filteredTopics.length > 0 ? filteredTopics : eflQuickTopics).map((t: any) => (
                      <option key={t.topicId} value={`${t.topicNumber}. ${t.lessonTopic}`} />
                    ))}
                  </datalist>
                )}
              </label>
            </div>

            {/* AI AUTOFILL CALLOUT PANEL */}
            <div className="db-warn" style={{ marginTop: '24px', background: 'rgba(99, 102, 241, 0.1)', borderColor: '#818cf8', color: '#1e1b4b' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <Sparkles size={18} color="#4f46e5" style={{ marginTop: '2px' }} />
                <div>
                  <strong>พลังสร้างสรรค์แผนการสอนด้วย Gemini AI</strong>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#4b5563' }}>
                    เมื่อคุณกรอกข้อมูลชั้น วิชา และเรื่องที่สอนเสร็จเรียบร้อย 
                    คุณสามารถกดปุ่ม สร้างแผนอัตโนมัติด้วย AI เพื่อวิเคราะห์มาตรฐาน ตัวชี้วัด และจุดประสงค์ ทั้ง 19 ฟิลด์อัตโนมัติ
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleAIMagicFill}
                disabled={aiLoading || !fields.lessonTopic}
              >
                <Sparkles size={13} /> {aiLoading ? 'กำลังสร้างแผนด้วย AI...' : 'สร้างแผนอัตโนมัติด้วย AI'}
              </button>
            </div>

            <div className="tab-nav">
              <div></div>
              <button type="button" className="btn btn-ghost" onClick={() => setActiveTab(2)}>ถัดไป <ChevronRight size={14} /></button>
            </div>
          </div>
        )}

        {/* ─── TAB 2: STANDARDS & CORE CONTENTS (ข้อ 1-4) ─── */}
        {activeTab === 2 && (
          <div className="tab-panel card">
            <h3>1. สาระสำคัญ และ 2. มาตรฐานการเรียนรู้และตัวชี้วัด (ข้อ 1-2)</h3>
            
            <label className="field" style={{ marginBottom: '16px' }}>
              1. สาระสำคัญ (Concept / Big Idea)
              <textarea className="lg" value={fields.essentialConcept} onChange={e => setFields({ ...fields, essentialConcept: e.target.value })} />
            </label>

            <hr className="divider" />

            <h3>2. มาตรฐานการเรียนรู้และตัวชี้วัด (Learning Standards & Indicators)</h3>
            
            <div className="g1">
              <label className="field">
                มาตรฐานการเรียนรู้ที่เกี่ยวข้อง (Learning Standards)
                <textarea className="lg" value={fields.learningStandard} onChange={e => setFields({ ...fields, learningStandard: e.target.value })} placeholder="เช่น มาตรฐาน ต 1.1 เข้าใจและตีความ..." />
              </label>

              {/* Standards Smart Dropdown */}
              {options.standard && options.standard.length > 0 && (
                <SmartDropdown 
                  options={options.standard.map((opt: any) => ({
                    id: opt.optionId,
                    label: opt.optionName,
                    value: opt.optionText || '',
                    selected: (fields.learningStandard || '').includes(opt.optionName)
                  }))}
                  placeholder="ค้นหาหรือเลือกจากคลังมาตรฐานการเรียนรู้..."
                  onSelect={(opt) => {
                    const currentVal = fields.learningStandard || '';
                    const currentItems = currentVal.split('\n').map((i: string) => i.trim()).filter(Boolean);
                    const standardText = `${opt.label} ${opt.value}`;
                    if (currentVal.includes(opt.label)) {
                      // Remove
                      const filtered = currentItems.filter((i: string) => !i.includes(opt.label));
                      setFields(prev => ({ ...prev, learningStandard: filtered.join('\n') }));
                    } else {
                      // Add
                      currentItems.push(standardText);
                      setFields(prev => ({ ...prev, learningStandard: currentItems.join('\n') }));
                    }
                  }}
                />
              )}

              {/* During Indicators Section */}
              <div className="g1" style={{ marginTop: '12px' }}>
                <label className="field">
                  ตัวชี้วัดระหว่างทาง (Indicator During)
                  <textarea className="lg" value={fields.indicatorDuring} onChange={e => setFields({ ...fields, indicatorDuring: e.target.value })} placeholder="คลิกเลือกตัวชี้วัดระหว่างทางด้านล่าง..." />
                </label>
                
                {fields.gradeLevel && filteredIndicators.filter((ind: any) => ind.indicatorType === 'during').length > 0 && (
                  <SmartDropdown 
                    options={filteredIndicators.filter((ind: any) => ind.indicatorType === 'during').map((ind: any) => {
                      const selectedArr = fields.indicatorSelectedIds ? fields.indicatorSelectedIds.split(',') : [];
                      return {
                        id: ind.indicatorId,
                        label: ind.indicatorCode,
                        value: ind.indicatorText,
                        selected: selectedArr.includes(ind.indicatorId)
                      };
                    })}
                    placeholder="ค้นหาหรือเลือกตัวชี้วัดระหว่างทางจากคลัง..."
                    onSelect={(opt) => {
                      const selectedArr = fields.indicatorSelectedIds ? fields.indicatorSelectedIds.split(',') : [];
                      const isChecked = selectedArr.includes(opt.id);
                      handleIndicatorCheck(opt.id, !isChecked);
                    }}
                  />
                )}
              </div>

              {/* Final Indicators Section */}
              <div className="g1" style={{ marginTop: '12px' }}>
                <label className="field">
                  ตัวชี้วัดปลายทาง (Indicator Final)
                  <textarea className="lg" value={fields.indicatorFinal} onChange={e => setFields({ ...fields, indicatorFinal: e.target.value })} placeholder="คลิกเลือกตัวชี้วัดปลายทางด้านล่าง..." />
                </label>

                {fields.gradeLevel && filteredIndicators.filter((ind: any) => ind.indicatorType === 'final').length > 0 && (
                  <SmartDropdown 
                    options={filteredIndicators.filter((ind: any) => ind.indicatorType === 'final').map((ind: any) => {
                      const selectedArr = fields.indicatorSelectedIds ? fields.indicatorSelectedIds.split(',') : [];
                      return {
                        id: ind.indicatorId,
                        label: ind.indicatorCode,
                        value: ind.indicatorText,
                        selected: selectedArr.includes(ind.indicatorId)
                      };
                    })}
                    placeholder="ค้นหาหรือเลือกตัวชี้วัดปลายทางจากคลัง..."
                    onSelect={(opt) => {
                      const selectedArr = fields.indicatorSelectedIds ? fields.indicatorSelectedIds.split(',') : [];
                      const isChecked = selectedArr.includes(opt.id);
                      handleIndicatorCheck(opt.id, !isChecked);
                    }}
                  />
                )}
              </div>
            </div>

            <hr className="divider" />

            <h3>3. สมรรถนะ และ 4. คุณลักษณะอันพึงประสงค์ (ข้อ 3-4)</h3>

            {/* Competency Smart Dropdown */}
            {options.competency && options.competency.length > 0 && (
              <SmartDropdown 
                options={options.competency.map((opt: any) => ({
                  id: opt.optionId,
                  label: opt.optionName,
                  value: opt.optionText || '',
                  selected: (fields.competencies || '').includes(opt.optionName)
                }))}
                placeholder="ค้นหาสมรรถนะสำคัญผู้เรียนจากคลัง..."
                onSelect={(opt) => handleChipClick('competencies', opt.label)}
              />
            )}
            <label className="field" style={{ marginBottom: '16px' }}>
              3. สมรรถนะสำคัญของผู้เรียน (เขียนแจกแจงเป็นข้อๆ)
              <textarea value={fields.competencies} onChange={e => setFields({ ...fields, competencies: e.target.value })} />
            </label>

            {/* Desired Attributes Smart Dropdown */}
            {options.attribute && options.attribute.length > 0 && (
              <SmartDropdown 
                options={options.attribute.map((opt: any) => ({
                  id: opt.optionId,
                  label: opt.optionName,
                  value: opt.optionText || '',
                  selected: (fields.desiredAttributes || '').includes(opt.optionName)
                }))}
                placeholder="ค้นหาคุณลักษณะอันพึงประสงค์จากคลัง..."
                onSelect={(opt) => handleChipClick('desiredAttributes', opt.label)}
              />
            )}
            <label className="field" style={{ marginBottom: '16px' }}>
              4. คุณลักษณะอันพึงประสงค์ (เขียนแจกแจงเป็นข้อๆ)
              <textarea value={fields.desiredAttributes} onChange={e => setFields({ ...fields, desiredAttributes: e.target.value })} />
            </label>

            <div className="tab-nav">
              <button type="button" className="btn btn-ghost" onClick={() => setActiveTab(1)}><ChevronLeft size={14} /> ย้อนกลับ</button>
              <button type="button" className="btn btn-ghost" onClick={() => setActiveTab(3)}>ถัดไป <ChevronRight size={14} /></button>
            </div>
          </div>
        )}

        {/* ─── TAB 3: OBJECTIVES, SKILLS & CONTENT (ข้อ 5-7) ─── */}
        {activeTab === 3 && (
          <div className="tab-panel card">
            <h3>5. จุดประสงค์การเรียนรู้ (Learning Objectives)</h3>
            <div className="g1">
              <label className="field">
                จุดประสงค์ด้านความรู้ (Knowledge - K)
                <textarea value={fields.objectiveK} onChange={e => setFields({ ...fields, objectiveK: e.target.value })} />
                {(options.objectiveK || options.objective) && (options.objectiveK || options.objective).length > 0 && (
                  <SmartDropdown 
                    options={(options.objectiveK || options.objective).map((opt: any) => ({
                      id: opt.optionId,
                      label: opt.optionName,
                      value: opt.optionText || '',
                      selected: (fields.objectiveK || '').includes(opt.optionName)
                    }))}
                    placeholder="ค้นหาจุดประสงค์ (K) จากคลัง..."
                    onSelect={(opt) => handleChipClick('objectiveK', opt.label)}
                  />
                )}
              </label>
              <label className="field">
                จุดประสงค์ด้านทักษะกระบวนการ (Process - P)
                <textarea value={fields.objectiveP} onChange={e => setFields({ ...fields, objectiveP: e.target.value })} />
                {(options.objectiveP || options.objective) && (options.objectiveP || options.objective).length > 0 && (
                  <SmartDropdown 
                    options={(options.objectiveP || options.objective).map((opt: any) => ({
                      id: opt.optionId,
                      label: opt.optionName,
                      value: opt.optionText || '',
                      selected: (fields.objectiveP || '').includes(opt.optionName)
                    }))}
                    placeholder="ค้นหาจุดประสงค์ (P) จากคลัง..."
                    onSelect={(opt) => handleChipClick('objectiveP', opt.label)}
                  />
                )}
              </label>
              <label className="field">
                จุดประสงค์ด้านคุณลักษณะ (Attitude - A)
                <textarea value={fields.objectiveA} onChange={e => setFields({ ...fields, objectiveA: e.target.value })} />
                {(options.objectiveA || options.objective) && (options.objectiveA || options.objective).length > 0 && (
                  <SmartDropdown 
                    options={(options.objectiveA || options.objective).map((opt: any) => ({
                      id: opt.optionId,
                      label: opt.optionName,
                      value: opt.optionText || '',
                      selected: (fields.objectiveA || '').includes(opt.optionName)
                    }))}
                    placeholder="ค้นหาจุดประสงค์ (A) จากคลัง..."
                    onSelect={(opt) => handleChipClick('objectiveA', opt.label)}
                  />
                )}
              </label>
            </div>

            <hr className="divider" />

            {/* Century Skills Smart Dropdown */}
            {options.skill21 && options.skill21.length > 0 && (
              <SmartDropdown 
                options={options.skill21.map((opt: any) => ({
                  id: opt.optionId,
                  label: opt.optionName,
                  value: opt.optionText || '',
                  selected: (fields.skills21 || '').includes(opt.optionName)
                }))}
                placeholder="ค้นหาทักษะแห่งศตวรรษที่ 21 จากคลัง..."
                onSelect={(opt) => handleChipClick('skills21', opt.label)}
              />
            )}
            <label className="field" style={{ marginBottom: '16px' }}>
              5.1 ทักษะที่จำเป็นในศตวรรษที่ 21 (เขียนแจกแจงเป็นข้อๆ)
              <textarea value={fields.skills21} onChange={e => setFields({ ...fields, skills21: e.target.value })} />
            </label>

            <hr className="divider" />

            <label className="field" style={{ marginBottom: '16px' }}>
              6. เนื้อหาสาระ / สาระการเรียนรู้ (Learning Content)
              <textarea className="lg" style={{ minHeight: '120px' }} value={fields.learningContent} onChange={e => setFields({ ...fields, learningContent: e.target.value })} placeholder="คำศัพท์ โครงสร้างประโยค หรือเนื้อหาหลักที่เรียน..." />
            </label>

            <hr className="divider" />

            <h3>7. สื่อและแหล่งการเรียนรู้ (สื่อ แหล่งเรียนรู้ และภาระงาน)</h3>
            {/* Media & Sources Fields */}
            <div className="g3">
              <label className="field">
                1) สื่อการเรียนรู้
                {options.media && options.media.length > 0 && (
                  <SmartDropdown 
                    options={options.media.map((opt: any) => {
                      const prefixedLabel = formatOptionWithGroupPrefix(opt);
                      return {
                        id: opt.optionId,
                        label: prefixedLabel,
                        value: opt.optionText || '',
                        selected: (fields.learningMedia || '').includes(prefixedLabel)
                      };
                    })}
                    placeholder="ค้นหาสื่อการเรียนรู้จากคลัง..."
                    onSelect={(opt) => handleChipClick('learningMedia', opt.label)}
                  />
                )}
                <textarea className="lg" value={fields.learningMedia} onChange={e => setFields({ ...fields, learningMedia: e.target.value })} placeholder="- ใบงาน\n- สไลด์ประกอบการสอน" style={{ marginTop: '8px' }} />
              </label>
              <label className="field">
                2) แหล่งเรียนรู้
                {options.learningSource && options.learningSource.length > 0 && (
                  <SmartDropdown 
                    options={options.learningSource.map((opt: any) => {
                      const prefixedLabel = formatOptionWithGroupPrefix(opt);
                      return {
                        id: opt.optionId,
                        label: prefixedLabel,
                        value: opt.optionText || '',
                        selected: (fields.learningSources || '').includes(prefixedLabel)
                      };
                    })}
                    placeholder="ค้นหาแหล่งเรียนรู้จากคลัง..."
                    onSelect={(opt) => handleChipClick('learningSources', opt.label)}
                  />
                )}
                <textarea className="lg" value={fields.learningSources} onChange={e => setFields({ ...fields, learningSources: e.target.value })} placeholder="- ห้องสมุดโรงเรียน\n- สื่ออินเทอร์เน็ต" style={{ marginTop: '8px' }} />
              </label>
              <label className="field">
                3) ชิ้นงาน / ภาระงาน
                {options.task && options.task.length > 0 && (
                  <SmartDropdown 
                    options={options.task.map((opt: any) => {
                      const prefixedLabel = formatOptionWithGroupPrefix(opt);
                      return {
                        id: opt.optionId,
                        label: prefixedLabel,
                        value: opt.optionText || '',
                        selected: (fields.tasks || '').includes(prefixedLabel)
                      };
                    })}
                    placeholder="ค้นหาชิ้นงาน/ภาระงานจากคลัง..."
                    onSelect={(opt) => handleChipClick('tasks', opt.label)}
                  />
                )}
                <textarea className="lg" value={fields.tasks} onChange={e => setFields({ ...fields, tasks: e.target.value })} placeholder="- ใบงานสรุปคำศัพท์" style={{ marginTop: '8px' }} />
              </label>
            </div>

            <div className="tab-nav">
              <button type="button" className="btn btn-ghost" onClick={() => setActiveTab(2)}><ChevronLeft size={14} /> ย้อนกลับ</button>
              <button type="button" className="btn btn-ghost" onClick={() => setActiveTab(4)}>ถัดไป <ChevronRight size={14} /></button>
            </div>
          </div>
        )}

        {/* ─── TAB 4: PROCESS & ASSESSMENT (ข้อ 8-9) ─── */}
        {activeTab === 4 && (
          <div className="tab-panel card">
            <h3>8. วิธีการดำเนินกิจกรรม ตามแนวคิด Active Learning</h3>
            <label className="field">
              กระบวนการสอน (เช่น ขั้นนำ ขั้นสอน ขั้นสรุป หรือ 5E Model)
              <textarea className="lg" style={{ minHeight: '220px' }} value={fields.learningProcess} onChange={e => setFields({ ...fields, learningProcess: e.target.value })} />
            </label>

            <hr className="divider" />
            
            <h3>9. การวัดและการประเมินผล (K/P/A Assessment)</h3>
            
            {/* K Assessment Card */}
            <div className="assess-card">
              <div className="assess-header">
                <h4>9.1 ประเมินด้านความรู้ (Knowledge - K)</h4>
              </div>
              <div className="g2">
                <label className="field">
                  วิธีการวัดผล
                  {renderAssessmentChoiceDropdown('K', 'method', 'methodK', 'ค้นหาวิธีการวัดผล (K) จากฐานข้อมูล...')}
                  <input value={fields.methodK} onChange={e => setFields({ ...fields, methodK: e.target.value })} placeholder="เช่น การทำใบงานคำศัพท์" />
                </label>
                <label className="field">
                  เครื่องมือประเมิน
                  {renderAssessmentChoiceDropdown('K', 'tool', 'toolK', 'ค้นหาเครื่องมือประเมิน (K) จากฐานข้อมูล...')}
                  <input value={fields.toolK} onChange={e => setFields({ ...fields, toolK: e.target.value })} placeholder="เช่น ใบงานที่ 1.1" />
                </label>

                <label className="field">
                  เกณฑ์ผ่านประเมิน
                  {renderAssessmentChoiceDropdown('K', 'criteria', 'criteriaK', 'ค้นหาเกณฑ์ผ่านประเมิน (K) จากฐานข้อมูล...', 'replace')}
                  <input value={fields.criteriaK} onChange={e => setFields({ ...fields, criteriaK: e.target.value })} />
                </label>
                <label className="field fw">
                  เกณฑ์การประเมินแบบ Rubric (ด้าน K)
                  <textarea value={fields.rubricK} onChange={e => setFields({ ...fields, rubricK: e.target.value })} placeholder="ระดับ 5 = ..., ระดับ 4 = ..., ระดับ 3 = ..., ระดับ 2 = ..., ระดับ 1 = ..." style={{ minHeight: '70px' }} />
                </label>
              </div>
            </div>

            {/* P Assessment Card */}
            <div className="assess-card">
              <div className="assess-header">
                <h4>9.2 ประเมินด้านทักษะกระบวนการ (Process - P)</h4>
              </div>
              <div className="g2">
                <label className="field">
                  วิธีการวัดผล
                  {renderAssessmentChoiceDropdown('P', 'method', 'methodP', 'ค้นหาวิธีการวัดผล (P) จากฐานข้อมูล...')}
                  <input value={fields.methodP} onChange={e => setFields({ ...fields, methodP: e.target.value })} placeholder="เช่น การสังเกตพฤติกรรมการพูด" />
                </label>
                <label className="field">
                  เครื่องมือประเมิน
                  {renderAssessmentChoiceDropdown('P', 'tool', 'toolP', 'ค้นหาเครื่องมือประเมิน (P) จากฐานข้อมูล...')}
                  <input value={fields.toolP} onChange={e => setFields({ ...fields, toolP: e.target.value })} placeholder="เช่น แบบสังเกตการพูดประโยค" />
                </label>

                <label className="field">
                  เกณฑ์ผ่านประเมิน
                  {renderAssessmentChoiceDropdown('P', 'criteria', 'criteriaP', 'ค้นหาเกณฑ์ผ่านประเมิน (P) จากฐานข้อมูล...', 'replace')}
                  <input value={fields.criteriaP} onChange={e => setFields({ ...fields, criteriaP: e.target.value })} />
                </label>
                <label className="field fw">
                  เกณฑ์การประเมินแบบ Rubric (ด้าน P)
                  <textarea value={fields.rubricP} onChange={e => setFields({ ...fields, rubricP: e.target.value })} placeholder="ระดับ 5 = ..., ระดับ 4 = ..., ระดับ 3 = ..., ระดับ 2 = ..., ระดับ 1 = ..." style={{ minHeight: '70px' }} />
                </label>
              </div>
            </div>

            {/* A Assessment Card */}
            <div className="assess-card">
              <div className="assess-header">
                <h4>9.3 ประเมินด้านคุณลักษณะ (Attitude - A)</h4>
              </div>
              <div className="g2">
                <label className="field">
                  วิธีการวัดผล
                  {renderAssessmentChoiceDropdown('A', 'method', 'methodA', 'ค้นหาวิธีการวัดผล (A) จากฐานข้อมูล...')}
                  <input value={fields.methodA} onChange={e => setFields({ ...fields, methodA: e.target.value })} placeholder="เช่น สังเกตพฤติกรรมใฝ่เรียนรู้" />
                </label>
                <label className="field">
                  เครื่องมือประเมิน
                  {renderAssessmentChoiceDropdown('A', 'tool', 'toolA', 'ค้นหาเครื่องมือประเมิน (A) จากฐานข้อมูล...')}
                  <input value={fields.toolA} onChange={e => setFields({ ...fields, toolA: e.target.value })} placeholder="เช่น แบบประเมินคุณลักษณะอันพึงประสงค์" />
                </label>

                <label className="field">
                  เกณฑ์ผ่านประเมิน
                  {renderAssessmentChoiceDropdown('A', 'criteria', 'criteriaA', 'ค้นหาเกณฑ์ผ่านประเมิน (A) จากฐานข้อมูล...', 'replace')}
                  <input value={fields.criteriaA} onChange={e => setFields({ ...fields, criteriaA: e.target.value })} />
                </label>
                <label className="field fw">
                  เกณฑ์การประเมินแบบ Rubric (ด้าน A)
                  <textarea value={fields.rubricA} onChange={e => setFields({ ...fields, rubricA: e.target.value })} placeholder="ระดับ 5 = ..., ระดับ 4 = ..., ระดับ 3 = ..., ระดับ 2 = ..., ระดับ 1 = ..." style={{ minHeight: '70px' }} />
                </label>
              </div>
            </div>

            <div className="tab-nav">
              <button type="button" className="btn btn-ghost" onClick={() => setActiveTab(3)}><ChevronLeft size={14} /> ย้อนกลับ</button>
              <button type="button" className="btn btn-ghost" onClick={() => setActiveTab(5)}>ถัดไป <ChevronRight size={14} /></button>
            </div>
          </div>
        )}

        {/* ─── TAB 5: AFTER ACTION REVIEW ─── */}
        {activeTab === 5 && (
          <div className="tab-panel card">
            <h3>10. บันทึกหลังการจัดกระบวนการเรียนรู้ (After Action Review)</h3>
            <div className="g3">
              <label className="field">
                ผลการเรียนรู้ด้านความรู้ (K)
                <textarea className="lg" value={fields.resultK} onChange={e => setFields({ ...fields, resultK: e.target.value })} placeholder="เช่น นักเรียนจำนวน 85% ผ่านเกณฑ์..." />
              </label>
              <label className="field">
                ผลการเรียนรู้ด้านทักษะกระบวนการ (P)
                <textarea className="lg" value={fields.resultP} onChange={e => setFields({ ...fields, resultP: e.target.value })} placeholder="เช่น นักเรียนพูดตอบคำถามได้ถูกต้อง..." />
              </label>
              <label className="field">
                ผลการเรียนรู้ด้านคุณลักษณะ (A)
                <textarea className="lg" value={fields.resultA} onChange={e => setFields({ ...fields, resultA: e.target.value })} placeholder="เช่น นักเรียนมีความตั้งใจเรียนดี..." />
              </label>
            </div>

            <div className="g2" style={{ marginTop: '16px' }}>
              <label className="field">
                ปัญหาและอุปสรรคที่พบ
                <textarea className="lg" value={fields.problems} onChange={e => setFields({ ...fields, problems: e.target.value })} placeholder="เช่น นักเรียนบางส่วนเขียนสะกดคำได้ช้า..." />
              </label>
              <label className="field">
                แนวทางการแก้ไขและการพัฒนานักเรียน
                <textarea className="lg" value={fields.solutions} onChange={e => setFields({ ...fields, solutions: e.target.value })} placeholder="เช่น จัดทำสื่อเสริมฝึกหัดเพิ่มเติมหลังสอน..." />
              </label>
            </div>

            <div className="tab-nav">
              <button type="button" className="btn btn-ghost" onClick={() => setActiveTab(4)}><ChevronLeft size={14} /> ย้อนกลับ</button>
              <div></div>
            </div>
          </div>
        )}

      </form>

      {/* ─── AI LOADING SPINNER OVERLAY ─── */}
      {aiLoading && (
        <div className="loading-overlay">
          <div className="spinner" />
          <strong>Gemini AI กำลังวิเคราะห์และร่างข้อความแผนการสอน...</strong>
          <span style={{ fontSize: '12px', fontWeight: 'normal', opacity: 0.85 }}>วิเคราะห์สัมพันธ์ มาตรฐานและตัวชี้วัด (อาจใช้เวลา 5-10 วินาที)</span>
        </div>
      )}

      {/* ─── SAVING SPINNER OVERLAY ─── */}
      {saving && (
        <div className="loading-overlay">
          <div className="spinner" />
          <strong>กำลังบันทึกข้อมูลแผนการเรียนรู้ลง Supabase...</strong>
        </div>
      )}

      {/* ─── BACKUP REASON MODAL (EDIT MODE) ─── */}
      {showBackupReason && (
        <div className="modal-bg">
          <div className="modal-box">
            <h3>ระบุเหตุผลในการแก้ไขแผน</h3>
            <p>ระบบจะสร้างประวัติสำรอง (Version History) แผนการสอนเวอร์ชันก่อนหน้านี้เก็บไว้ในตารางสำรอง เพื่อให้คุณย้อนกลับได้เสมอ</p>
            <label className="field">
              คำอธิบายการสำรองข้อมูล
              <input 
                value={backupReasonText} 
                onChange={e => setBackupReasonText(e.target.value)} 
                placeholder="เช่น ปรับปรุงกระบวนการ Active Learning, แก้ไขตัวสะกดคำ"
              />
            </label>
            <div className="btn-row" style={{ justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowBackupReason(false)}>ยกเลิก</button>
              <button type="button" className="btn btn-primary" onClick={confirmUpdate}>ตกลง (บันทึก)</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spinner {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
