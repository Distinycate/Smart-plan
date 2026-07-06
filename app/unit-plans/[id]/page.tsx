import UnitPlannerForm from '../UnitPlannerForm';

export default function EditUnitPlanPage({ params }: { params: { id: string } }) {
  return <UnitPlannerForm unitPlanId={params.id} />;
}

