const { supabase } = require('../config/supabase');

/**
 * Fire Hotspot Service — manages fire_hotspots table.
 */

const getFireHotspots = async ({ page = 1, limit = 100, minConfidence = 0 } = {}) => {
  const from = (page - 1) * limit;
  const { data, error, count } = await supabase
    .from('fire_hotspots')
    .select('*', { count: 'exact' })
    .gte('confidence', minConfidence)
    .order('reported_at', { ascending: false })
    .range(from, from + limit - 1);

  if (error) throw new Error(error.message);
  return { data, total: count, page, limit };
};

const getHotspotsByBoundingBox = async ({ minLat, maxLat, minLng, maxLng }) => {
  const { data, error } = await supabase
    .from('fire_hotspots')
    .select('*')
    .gte('lat', minLat)
    .lte('lat', maxLat)
    .gte('lng', minLng)
    .lte('lng', maxLng)
    .order('reported_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

const createHotspot = async ({ lat, lng, confidence, source = 'NASA_FIRMS', region_id = null }) => {
  const { data, error } = await supabase
    .from('fire_hotspots')
    .insert({ lat, lng, confidence, source, region_id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

const batchCreateHotspots = async (hotspots) => {
  const rows = hotspots.map((h) => ({
    lat: h.lat,
    lng: h.lng,
    confidence: h.confidence,
    source: h.source || 'NASA_FIRMS',
    region_id: h.region_id || null,
  }));

  const { data, error } = await supabase.from('fire_hotspots').insert(rows).select();
  if (error) throw new Error(error.message);
  return data;
};

const deleteHotspot = async (id) => {
  const { error } = await supabase.from('fire_hotspots').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};

module.exports = { getFireHotspots, getHotspotsByBoundingBox, createHotspot, batchCreateHotspots, deleteHotspot };
