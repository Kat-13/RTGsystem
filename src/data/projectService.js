import { supabase } from '../lib/supabase'; 

export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function listProjects() {
  const user = await getUser();
  const { data: memberships, error: mErr } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', user.id);
  if (mErr) throw mErr;

  const ids = (memberships || []).map(m => m.project_id);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('projects')
    .select('id,name,description,created_at')
    .in('id', ids)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createProject(name, description) {
  const user = await getUser();
  const { data: p, error } = await supabase
    .from('projects')
    .insert({ name, description: description ?? null, owner_id: user.id })
    .select()
    .single();
  if (error) throw error;

  const { error: mErr } = await supabase
    .from('project_members')
    .insert({ project_id: p.id, user_id: user.id, role: 'owner' });
  if (mErr) throw mErr;

  return p;
}

export async function listStreams(projectId) {
  const { data, error } = await supabase
    .from('streams').select('*')
    .eq('project_id', projectId)
    .order('order', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createStream(projectId, payload) {
  const { data, error } = await supabase
    .from('streams')
    .insert({ project_id: projectId, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateStream(id, patch) {
  const { data, error } = await supabase
    .from('streams').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
export async function deleteStream(id) {
  const { error } = await supabase.from('streams').delete().eq('id', id);
  if (error) throw error;
}

export async function listDeliverables(projectId) {
  const { data, error } = await supabase
    .from('deliverables').select('*')
    .eq('project_id', projectId)
    .order('order', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function upsertDeliverable(projectId, row) {
  const payload = { ...row, project_id: projectId };
  const { data, error } = await supabase
    .from('deliverables')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDeliverable(id) {
  const { error } = await supabase.from('deliverables').delete().eq('id', id);
  if (error) throw error;
}
