const { supabase } = require('../config/supabase');
const { success, created, error, badRequest, unauthorized } = require('../utils/response');

/**
 * Auth Controller — Register, Login, Logout, Forgot Password, Session, Profile.
 * Uses Supabase Auth exclusively. No Prisma, no custom JWT generation.
 */

const register = async (req, res) => {
  try {
    const { email, password, full_name, role = 'forest_officer' } = req.body;
    if (!email || !password || !full_name) {
      return badRequest(res, 'email, password, and full_name are required');
    }

    const { data, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });

    if (authError) return error(res, authError.message, 400);

    // Mirror to public users table (handled by DB trigger, but explicit insert as fallback)
    await supabase.from('users').upsert({
      id: data.user.id,
      email,
      full_name,
      role,
    });

    return created(res, { id: data.user.id, email }, 'User registered successfully');
  } catch (err) {
    return error(res, 'Registration failed', 500, err.message);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return badRequest(res, 'email and password are required');

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) return unauthorized(res, authError.message);

    return success(res, {
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata?.role || 'forest_officer',
        full_name: data.user.user_metadata?.full_name,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    }, 'Login successful');
  } catch (err) {
    return error(res, 'Login failed', 500, err.message);
  }
};

const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      // Invalidate the specific session
      await supabase.auth.admin.signOut(token);
    }
    return success(res, null, 'Logged out successfully');
  } catch (err) {
    return error(res, 'Logout failed', 500, err.message);
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return badRequest(res, 'email is required');

    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
    });

    if (authError) return error(res, authError.message, 400);
    return success(res, null, 'Password reset email sent');
  } catch (err) {
    return error(res, 'Password reset failed', 500, err.message);
  }
};

const getProfile = async (req, res) => {
  try {
    const { data, error: dbError } = await supabase
      .from('users')
      .select('id, email, full_name, role, avatar_url, created_at')
      .eq('id', req.user.id)
      .single();

    if (dbError) return error(res, dbError.message, 400);
    return success(res, data);
  } catch (err) {
    return error(res, 'Failed to fetch profile', 500, err.message);
  }
};

const refreshSession = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return badRequest(res, 'refresh_token is required');

    const { data, error: authError } = await supabase.auth.refreshSession({ refresh_token });
    if (authError) return unauthorized(res, authError.message);

    return success(res, {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    }, 'Session refreshed');
  } catch (err) {
    return error(res, 'Session refresh failed', 500, err.message);
  }
};

module.exports = { register, login, logout, forgotPassword, getProfile, refreshSession };
