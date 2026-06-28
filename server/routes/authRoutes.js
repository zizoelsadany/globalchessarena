import { Router } from "express";
import { 
  login, 
  loginSchema, 
  me, 
  register, 
  registerSchema, 
  googleLogin,
  verifyOtp,
  verifyOtpSchema,
  resendOtp,
  resendOtpSchema,
  forgotPassword,
  forgotPasswordSchema,
  resetPassword,
  resetPasswordSchema
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/google", googleLogin);
router.post("/verify-otp", validate(verifyOtpSchema), verifyOtp);
router.post("/resend-otp", validate(resendOtpSchema), resendOtp);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
router.get("/me", requireAuth, me);

export default router;
