const { supabase } = require('../config/supabase');

/**
 * User Service — CRUD operations on the `users` table via Supabase Auth + DB.
 */

const getAllUsers = async ({ page = 1, limit = 20 } = {}) => {
  const from = (page - 1) * limit;
  const { data, error, count } = await supabase
    .from('users')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  if (error) throw new Error(error.message);
  return { data, total: count, page, limit };
};

const getUserById = async (id) => {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data;
};

const getUserByEmail = async (email) => {
  const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
  if (error) throw new Error(error.message);
  return data;
};

const updateUser = async (id, updates) => {
  const { data, error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

const deleteUser = async (id) => {
  // Delete from auth (admin) and cascade to users table via DB trigger
  const { error: authError } = await supabase.auth.admin.deleteUser(id);
  if (authError) throw new Error(authError.message);
  return true;
};

const updateUserRole = async (id, role) => {
  const validRoles = ['admin', 'forest_officer', 'researcher', 'dma'];
  if (!validRoles.includes(role)) throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);

  const [{ error: metaError }, { error: dbError }] = await Promise.all([
    supabase.auth.admin.updateUserById(id, { user_metadata: { role } }),
    supabase.from('users').update({ role, updated_at: new Date().toISOString() }).eq('id', id),
  ]);

  if (metaError) throw new Error(metaError.message);
  if (dbError) throw new Error(dbError.message);
  return true;
};

module.exports = { getAllUsers, getUserById, getUserByEmail, updateUser, deleteUser, updateUserRole };
