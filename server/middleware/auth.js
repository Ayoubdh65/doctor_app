import jwt from "jsonwebtoken";

import { config } from "../config.js";

export function signDoctorToken(doctor) {
  return jwt.sign(
    {
      sub: String(doctor.id),
      username: doctor.username,
      fullName: doctor.full_name,
      specialization: doctor.specialization,
    },
    config.jwtSecret,
    { expiresIn: "12h" }
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    req.doctor = jwt.verify(token, config.jwtSecret);
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
