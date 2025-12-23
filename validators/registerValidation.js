import {z} from "zod";
 export const registerSchema = z.object({
    email: z.string().email(),
    password: z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password must contain at least one specil character")
});
export const loginSchema = z.object({
    email: z.string().email("Invalid email format").trim(),
    password: z.string().min(1, "Password is required")
});

export const resetPasswordSchema = z.object({
    Newpassword: z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password must contain at least one specil character"),
    
    ConfirmPassword: z.string()
     .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password must contain at least one specil character")
})

export const mfaVerifySchema = z.object({
    token: z.string()
        .length(6, "Code must be 6 digits")
        .regex(/^\d+$/, "Code must contain only digits")
})