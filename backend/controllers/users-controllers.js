const { v7: uuid } = require("uuid");
const { validationResult } = require("express-validator");

const HttpError = require("../models/http-error");
const User = require("../models/user");
const Journal = require("../models/journal"); // 🔹 NEW: to count entries per user

// ─────────────────────────────
// GET USERS  (with entryCount)
// ─────────────────────────────
const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (err) {
    const error = new HttpError(
      "Fetching users failed, please try again later.",
      500
    );
    return next(error);
  }

  // For each user, count how many journal entries they have
  let usersWithCounts;
  try {
    usersWithCounts = await Promise.all(
      users.map(async (user) => {
        const entryCount = await Journal.countDocuments({ author: user.id });
        return {
          ...user.toObject({ getters: true }),
          entryCount,
        };
      })
    );
  } catch (err) {
    console.error("[getUsers] Error counting entries:", err);
    // Fallback: if counting fails, send users with 0 counts
    usersWithCounts = users.map((user) => ({
      ...user.toObject({ getters: true }),
      entryCount: 0,
    }));
  }

  res.json({ users: usersWithCounts });
};

// ─────────────────────────────
// SIGNUP
// ─────────────────────────────
const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { firstName, lastName, mobileNumber, email, password } = req.body;

  console.log("[SIGNUP] Request body:", req.body);

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "Signing up failed, please try again later.",
      500
    );
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError(
      "User exists already, please login instead.",
      422
    );
    return next(error);
  }

  const createdUser = new User({
    firstName,
    lastName,
    mobileNumber,
    email,
    image:
      "https://img.freepik.com/free-vector/user-circles-set_78370-4704.jpg?semt=ais_incoming&w=740&q=80",
    password,
    places: [],
  });

  try {
    await createdUser.save();
  } catch (err) {
    console.error("--- SIGNING UP FAILED ---", err);
    const error = new HttpError("Signing up failed, please try again.", 500);
    return next(error);
  }

  res.status(201).json({
    user: {
      id: createdUser.id,
      firstName: createdUser.firstName,
      lastName: createdUser.lastName,
      mobileNumber: createdUser.mobileNumber,
      email: createdUser.email,
      image: createdUser.image,
    },
  });
};

const login = async (req, res, next) => {
  console.log("[LOGIN] Request body received:", req.body);
  const { email, password } = req.body;
  console.log("[LOGIN] Login attempt for email:", email);

  let existingUser;

  try {
    existingUser = await User.findOne({ email: email });
    console.log("[LOGIN] User query result:", existingUser);
  } catch (err) {
    const error = new HttpError(
      "Logging in failed, please try again later.",
      500
    );
    return next(error);
  }

  if (!existingUser || existingUser.password !== password) {
    console.log("[LOGIN] Invalid credentials for email:", email);
    const error = new HttpError(
      "Invalid credentials, could not log you in.",
      401
    );
    return next(error);
  }

  console.log("[LOGIN] Login successful for:", existingUser.email);

  res.json({
    message: "Logged in!",
    userId: existingUser.id,
    email: existingUser.email,
    firstName: existingUser.firstName,
    lastName: existingUser.lastName,
    mobileNumber: existingUser.mobileNumber,
    image: existingUser.image,
  });
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
