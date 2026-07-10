const { supabase } = require('../config/supabase');

/**
 * Prediction Service — manages risk_predictions and ai_logs tables.
 */

const savePrediction = async ({ forest_region_id, risk_score, risk_category, confidence, reasons, feature_importance, telemetry_snapshot }) => {
  const { data, error } = await supabase
    .from('risk_predictions')
    .insert({
      forest_region_id,
      risk_score,
      risk_level: risk_category.toUpperCase(),
      confidence,
      ai_reason: reasons ? reasons.join(', ') : '',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

const getLatestPredictions = async (limit = 10) => {
  const { data, error } = await supabase
    .from('risk_predictions')
    .select('*, forest_regions(name, lat, lng)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data;
};

const getPredictionsByRegion = async (regionId, { page = 1, limit = 20 } = {}) => {
  const from = (page - 1) * limit;
  const { data, error, count } = await supabase
    .from('risk_predictions')
    .select('*', { count: 'exact' })
    .eq('forest_region_id', regionId)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  if (error) throw new Error(error.message);
  return { data, total: count, page, limit };
};

const logAIRequest = async ({ forest_name, model_used, input_payload, output_payload, latency_ms, success }) => {
  const { error } = await supabase.from('ai_logs').insert({
    model: model_used,
    prompt: JSON.stringify(input_payload),
    response: output_payload ? JSON.stringify(output_payload) : 'FAILED',
    latency: latency_ms,
  });

  if (error) {
    // Schema cache lag after fresh schema.sql run — self-heals within minutes
    if (error.message?.includes('schema cache')) {
      console.debug('[AI Log] Schema cache not yet refreshed, retrying next cycle');
    } else {
      console.error('[AI Log] Failed to log:', error.message);
    }
  }
};

const getPredictionStats = async () => {
  const { data, error } = await supabase
    .from('risk_predictions')
    .select('risk_category')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (error) throw new Error(error.message);

  const stats = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, total: data.length };
  data.forEach((p) => { if (stats[p.risk_category] !== undefined) stats[p.risk_category]++; });
  return stats;
};

module.exports = { savePrediction, getLatestPredictions, getPredictionsByRegion, logAIRequest, getPredictionStats };
