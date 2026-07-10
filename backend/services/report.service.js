const { supabase } = require('../config/supabase');
const { uploadFile } = require('./supabase.service');

const BUCKET = 'reports';

/**
 * Report Service — manages reports table and Supabase Storage uploads.
 */

const getReports = async ({ page = 1, limit = 20, userId = null } = {}) => {
  const from = (page - 1) * limit;
  let query = supabase
    .from('reports')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  if (userId) query = query.eq('created_by', userId);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { data, total: count, page, limit };
};

const getReportById = async (id) => {
  const { data, error } = await supabase.from('reports').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data;
};

/**
 * Save a PDF report buffer to Supabase Storage and record metadata in DB.
 */
const saveReport = async ({ title, location, userId, pdfBuffer }) => {
  const fileName = `${Date.now()}_${location.replace(/[^a-z0-9]/gi, '_')}.pdf`;
  const storagePath = `${userId || 'system'}/${fileName}`;

  const publicUrl = await uploadFile(BUCKET, storagePath, pdfBuffer, 'application/pdf');

  const { data, error } = await supabase
    .from('reports')
    .insert({
      title,
      location,
      file_url: publicUrl,
      storage_path: storagePath,
      created_by: userId || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

const deleteReport = async (id) => {
  const report = await getReportById(id);
  if (!report) throw new Error('Report not found');

  // Delete from storage
  if (report.storage_path) {
    await supabase.storage.from(BUCKET).remove([report.storage_path]);
  }

  const { error } = await supabase.from('reports').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};

module.exports = { getReports, getReportById, saveReport, deleteReport };
