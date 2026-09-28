import { NextRequest, NextResponse } from 'next/server';
import { 
  getSubjectProfile, 
  getRecommendedEvidenceTypes, 
  getRecommendedAssessmentTypes, 
  getRecommendedAssetTypes,
  getObjectiveGuidance 
} from '@/lib/smartPlanV3/subjectProfiles';

interface RouteContext {
  params: { key: string };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { key } = params;
    const { searchParams } = new URL(req.url);
    const focus = searchParams.get('focus') || undefined;

    const profile = getSubjectProfile(key);
    if (!profile) {
      return NextResponse.json({ success: false, error: `ไม่พบ Subject Profile: ${key}` }, { status: 404 });
    }

    const selectedFocus = focus || profile.learningFocuses[0]?.key;

    return NextResponse.json({
      success: true,
      data: {
        key: profile.key,
        labelTh: profile.labelTh,
        descriptionTh: profile.descriptionTh,
        learningFocuses: profile.learningFocuses,
        selectedFocus,
        objectiveGuidance: getObjectiveGuidance(profile.key, selectedFocus),
        evidenceRecommendations: getRecommendedEvidenceTypes(profile.key, selectedFocus),
        assessmentRecommendations: getRecommendedAssessmentTypes(profile.key, selectedFocus),
        assetRecommendations: getRecommendedAssetTypes(profile.key, selectedFocus),
        avoidPatterns: profile.avoidPatterns,
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูล Subject Profile' }, { status: 500 });
  }
}
