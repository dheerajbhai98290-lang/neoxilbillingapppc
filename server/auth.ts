import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { queryOne, execute, logAudit } from './db.ts';

// In-memory active session tokens mapped to user info
interface Session {
  userId: string;
  username: string;
  createdAt: number;
}

const activeSessions = new Map<string, Session>();

// Session timeout: 7 days
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function authenticateUser(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.headers['x-session-token'] as string);

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Session token missing' });
    return;
  }

  const session = activeSessions.get(token);
  if (!session) {
    res.status(401).json({ error: 'Unauthorized: Session invalid or expired' });
    return;
  }

  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    activeSessions.delete(token);
    res.status(401).json({ error: 'Unauthorized: Session expired' });
    return;
  }

  // Attach session to request
  (req as any).user = session;
  next();
}

export function handleLogin(req: Request, res: Response) {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const user = queryOne('SELECT * FROM admin_users WHERE username = ?', [username.trim()]);
  if (!user) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  const isValid = bcrypt.compareSync(password, user.password_hash);
  if (!isValid) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.set(token, {
    userId: user.id,
    username: user.username,
    createdAt: Date.now()
  });

  const now = new Date().toISOString();
  execute('UPDATE admin_users SET last_login = ? WHERE id = ?', [now, user.id]);
  logAudit('LOGIN', 'admin_users', user.id, `User ${user.username} logged in successfully`, req.ip);

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      email: user.email,
      lastLogin: now
    }
  });
}

export function handleGetMe(req: Request, res: Response) {
  const userSession = (req as any).user;
  const user = queryOne('SELECT id, username, full_name, email, last_login, created_at FROM admin_users WHERE id = ?', [userSession.userId]);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    email: user.email,
    lastLogin: user.last_login,
    createdAt: user.created_at
  });
}

export function handleLogout(req: Request, res: Response) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.headers['x-session-token'] as string);
  if (token) {
    activeSessions.delete(token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
}

export function handleUpdatePassword(req: Request, res: Response) {
  const userSession = (req as any).user;
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters long' });
    return;
  }

  const user = queryOne('SELECT * FROM admin_users WHERE id = ?', [userSession.userId]);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    res.status(400).json({ error: 'Current password is incorrect' });
    return;
  }

  const salt = bcrypt.genSaltSync(10);
  const newHash = bcrypt.hashSync(newPassword, salt);
  execute('UPDATE admin_users SET password_hash = ? WHERE id = ?', [newHash, user.id]);
  logAudit('PASSWORD_UPDATE', 'admin_users', user.id, 'Administrator password updated');

  res.json({ success: true, message: 'Password updated successfully' });
}

export function handleRecoverAccount(req: Request, res: Response) {
  const { username, recoveryPin, newPassword } = req.body;
  if (!username || !recoveryPin || !newPassword) {
    res.status(400).json({ error: 'Username, recovery PIN, and new password are required' });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters long' });
    return;
  }

  const user = queryOne('SELECT * FROM admin_users WHERE username = ?', [username.trim()]);
  if (!user) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }

  if (user.recovery_pin !== recoveryPin.trim()) {
    res.status(400).json({ error: 'Invalid recovery PIN' });
    return;
  }

  const salt = bcrypt.genSaltSync(10);
  const newHash = bcrypt.hashSync(newPassword, salt);
  execute('UPDATE admin_users SET password_hash = ? WHERE id = ?', [newHash, user.id]);
  logAudit('ACCOUNT_RECOVERY', 'admin_users', user.id, `Password reset via recovery PIN for ${user.username}`);

  res.json({ success: true, message: 'Password successfully reset. You can now log in.' });
}
