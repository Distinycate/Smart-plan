import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify if caller is admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const userIdToDelete = params.id;
    if (!userIdToDelete) {
      return NextResponse.json({ success: false, error: 'Missing user id' }, { status: 400 });
    }

    // Use service role to delete user from Supabase Auth
    const adminDb = getSupabaseAdmin();
    const { data, error } = await adminDb.auth.admin.deleteUser(userIdToDelete);

    if (error) {
      console.error('Error deleting user:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
