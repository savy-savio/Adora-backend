import { Router } from "express";
import { Profile } from "../models/Profile";
import { User } from "../models/User";
import { Business } from "../models/Business";
import { authMiddleware, type AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import cloudinary from "../config/cloudinary";
import { upload } from "../config/multer";
import { createNotification } from "../utils/notification";

const router = Router();

// GET PROFILE
router.get("/", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId as string;

    const profile = await Profile.findOne({ userId });
    
    if (!profile) {
      throw new AppError(404, "Profile not found. Please complete your signup first.");
    }

    const isProfileComplete = !!(
      profile.bio &&
      profile.phone &&
      profile.country &&
      profile.avatar
    );

    const profileWithStatus = {
      ...profile.toObject?.() || profile,
      isProfileComplete,
    };

    res.json({ success: true, profile: profileWithStatus });
  } catch (error) {
    next(error);
  }
});

// UPLOAD AVATAR
router.post(
  "/upload-avatar",
  authMiddleware,
  upload.single("avatar"),
  async (req: AuthRequest, res, next) => {
    try {
      if (!req.file) throw new AppError(400, "No file uploaded");

      const file = req.file as Express.Multer.File;
      const userId = req.userId as string;

      // Upload to Cloudinary
      const imageUrl = await new Promise<string>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "adora/avatars",
            resource_type: "auto",
            quality: "auto",
            fetch_format: "auto",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result?.secure_url || "");
          }
        );

        stream.end(file.buffer);
      });

      // Update DB
      const profile = await Profile.findOneAndUpdate(
        { userId },
        { avatar: imageUrl },
        { new: true }
      );

      if (!profile) throw new AppError(404, "Profile not found");

      const isComplete = !!(
        profile.name &&
        profile.phone &&
        profile.country &&
        profile.bio &&
        profile.avatar
      );

      if (isComplete) {
        await User.findByIdAndUpdate(userId, {
          profileCompleted: true,
          isFirstTimeUser: false,
        });

        await createNotification(
          userId,
          "success",
          "Profile Complete!",
          "Your profile is now complete. You can now create your business and set up your AI agent.",
          "/dashboard"
        );
      }

      res.json({
        success: true,
        profile,
        message: "Avatar uploaded successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

// UPDATE PROFILE
router.put("/", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId as string;

    const {
      name,
      avatar,
      bio,
      phone,
      country,
      businessName,
      businessDescription,
      agentName,
      agentGender,
    } = req.body;

    const profile = await Profile.findOneAndUpdate(
      { userId },
      {
        name,
        avatar,
        bio,
        phone,
        country,
        businessName,
        businessDescription,
        agentName,
        agentGender,
      },
      { new: true }
    );

    if (!profile) throw new AppError(404, "Profile not found");

    const isComplete = !!(
      profile.name &&
      profile.phone &&
      profile.country &&
      profile.bio &&
      profile.avatar
    );

    if (isComplete) {
      await User.findByIdAndUpdate(userId, {
        profileCompleted: true,
        isFirstTimeUser: false,
      });

      await createNotification(
        userId,
        "success",
        "Profile Complete!",
        "Your profile is now complete. You can now create your business and set up your AI agent.",
        "/dashboard"
      );
    }

    const profileWithStatus = {
      ...profile.toObject?.() || profile,
      isProfileComplete: isComplete,
    };

    res.json({ success: true, profile: profileWithStatus });
  } catch (error) {
    next(error);
  }
});

export default router;
