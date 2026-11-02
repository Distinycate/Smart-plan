import UnitPlannerForm from '../UnitPlannerForm';

export default async function EditUnitPlanPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <UnitPlannerForm unitPlanId={params.id} />;
}

