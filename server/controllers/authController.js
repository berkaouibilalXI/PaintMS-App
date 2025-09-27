// authController.js
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "paintms-secret-2025-17122002";

const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: "Username et mot de passe requis" });
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.status(400).json({ message: "Utilisateur non trouvé" });
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid)
    return res.status(400).json({ message: "Mot de passe incorrect" });
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1d" });
  res.json({ token, user: { id: user.id, username: user.username } });
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Mot de passe actuel et nouveau requis" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({
          message:
            "Le nouveau mot de passe doit contenir au moins 6 caractères",
        });
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      await logUserActivity(userId, "PASSWORD_CHANGE_FAILED", {
        reason: "Invalid current password",
      });
      return res.status(400).json({ message: "Mot de passe actuel incorrect" });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    // Log password change
    await logUserActivity(userId, "PASSWORD_CHANGED", { email: user.email });

    res.json({ message: "Mot de passe modifié avec succès" });
  } catch (err) {
    console.error("Change password error:", err);
    res
      .status(500)
      .json({ message: "Erreur lors du changement de mot de passe" });
  }
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    const { name, email, username } = req.body;
    const userId = req.user.userId;

    if (!email) {
      return res.status(400).json({ message: "Email requis" });
    }

    // Check if email is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id: userId },
      },
    });

    if (existingUser) {
      return res.status(400).json({ message: "Cet email est déjà utilisé" });
    }

    // Check if username is already taken
    if (username) {
      const existingUsername = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id: userId },
        },
      });
      if (existingUsername) {
        return res
          .status(400)
          .json({ message: "Ce nom d'utilisateur est déjà utilisé" });
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name, email, username },
    });

    // Log profile update
    await logUserActivity(userId, "PROFILE_UPDATED", { email, name, username });

    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json({ user: userWithoutPassword });
  } catch (err) {
    console.error("Update profile error:", err);
    res
      .status(500)
      .json({ message: "Erreur lors de la mise à jour du profil" });
  }
};

// Get user activity logs
const getUserLogs = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 50, offset = 0 } = req.query;

    const logs = await prisma.userActivityLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const totalLogs = await prisma.userActivityLog.count({
      where: { userId },
    });

    res.json({
      logs,
      total: totalLogs,
      hasMore: parseInt(offset) + parseInt(limit) < totalLogs,
    });
  } catch (err) {
    console.error("Get user logs error:", err);
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération des logs" });
  }
};

// Get user theme
const getUserTheme = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { theme: true },
    });
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    res.json({ theme: user.theme });
  } catch (err) {
    console.error("Error getting user theme:", err);
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération du thème" });
  }
};

// Update user theme
const updateTheme = async (req, res) => {
  try {
    const { theme } = req.body;
    const userId = req.user.userId;

    if (!theme || !["light", "dark"].includes(theme)) {
      return res
        .status(400)
        .json({ message: 'Thème invalide. Utilisez "light" ou "dark"' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { theme },
    });

    // Log theme update
    await logUserActivity(userId, "THEME_UPDATED", { theme });

    res.json({
      message: "Thème mis à jour avec succès",
      theme: updatedUser.theme,
    });
  } catch (err) {
    console.error("Update theme error:", err);
    res.status(500).json({ message: "Erreur lors de la mise à jour du thème" });
  }
};

// Helper function to log user activity
const logUserActivity = async (userId, action, details = {}) => {
  try {
    await prisma.userActivityLog.create({
      data: {
        userId,
        action,
        details: JSON.stringify(details),
        ipAddress: details.ipAddress || null,
        userAgent: details.userAgent || null,
      },
    });
  } catch (err) {
    console.error("Error logging user activity:", err);
  }
};

module.exports = {
  login,
  changePassword,
  updateProfile,
  getUserLogs,
  logUserActivity,
  getUserTheme,
  updateTheme,
};
