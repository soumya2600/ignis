const { supabase } = require('../config/supabase');

/**
 * Alert Service — CRUD on the `alerts` table.
 */

const getAlerts = async ({ page = 1, limit = 50, severity, isRead } = {}) => {
  const from = (page - 1) * limit;
  let query = supabase
    .from('alerts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  if (severity) query = query.eq('severity', severity.toUpperCase());
  if (typeof isRead === 'boolean') query = query.eq('is_read', isRead);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { data, total: count, page, limit };
};

const getAlertById = async (id) => {
  const { data, error } = await supabase.from('alerts').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data;
};

const createAlert = async ({ title, message, severity, lat, lng, region_id = null }) => {
  const { data, error } = await supabase
    .from('alerts')
    .insert({ title, message, severity: severity.toUpperCase(), lat, lng, region_id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

const markAlertRead = async (id) => {
  const { data, error } = await supabase
    .from('alerts')
    .update({ is_read: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

const markAllAlertsRead = async () => {
  const { error } = await supabase
    .from('alerts')
    .update({ is_read: true, updated_at: new Date().toISOString() })
    .eq('is_read', false);

  if (error) throw new Error(error.message);
  return true;
};

const deleteAlert = async (id) => {
  const { error } = await supabase.from('alerts').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};

const getUnreadCount = async () => {
  const { count, error } = await supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false);

  if (error) throw new Error(error.message);
  return count;
};

module.exports = { getAlerts, getAlertById, createAlert, markAlertRead, markAllAlertsRead, deleteAlert, getUnreadCount };
