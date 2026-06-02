import PlanForm from '../PlanForm';

export default function EditPlanPage({ params }: { params: { id: string } }) {
  return <PlanForm planId={params.id} />;
}
