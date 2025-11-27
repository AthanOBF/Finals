const { v7: uuid } = require("uuid");
const { validationResult } = require("express-validator");

const getCoordsForAddress = require("../util/geocode");
const Journal = require("../models/journal");
const HttpError = require("../models/http-error");


const getEntryById = async (req, res, next) => {
  const entryId = req.params.pid;

  console.log("[getEntryById] Fetching entry:", entryId);

  let entry;
  try {
    entry = await Journal.findById(entryId);
    console.log("[getEntryById] Found entry:", entry);
  } catch (err) {
    console.error("[getEntryById] Error:", err);
    const error = new HttpError(
      "Something went wrong, could not find an entry.",
      500
    );
    return next(error);
  }

  if (!entry) {
    return next(
      new HttpError("Could not find an entry for the provided id.", 404)
    );
  }

  res.json({ entry: entry.toObject({ getters: true }) });
};


const getEntriesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  console.log("[getEntriesByUserId] Fetching entries for user:", userId);

  let entries;
  try {
    entries = await Journal.find({ author: userId });
    console.log("[getEntriesByUserId] DB result:", entries);
  } catch (err) {
    console.error("[getEntriesByUserId] Error:", err);
    const error = new HttpError(
      "Fetching entries failed, please try again later",
      500
    );
    return next(error);
  }

  res.json({
    entries: entries.map((entry) => entry.toObject({ getters: true })),
  });
};


const createEntry = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("[createEntry] Validation errors:", errors.array());
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { headline, journalText, locationName, author } = req.body;

  console.log("[createEntry] Creating entry for:", author);

  let coordinates;
  try {
    coordinates = await getCoordsForAddress(locationName);
  } catch (error) {
    console.error("[createEntry] Geocoding error:", error);
    return next(error);
  }

  const createdEntry = new Journal({
    id: uuid(),
    headline,
    journalText,
    photo:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSpPkm3Hhfm2fa7zZFgK0HQrD8yvwSBmnm_Gw&s",
    locationName,
    coordinates: {
      latitude: coordinates.lat,
      longitude: coordinates.lng,
    },
    author,
  });

  try {
    await createdEntry.save();
    console.log("[createEntry] Entry saved:", createdEntry);
  } catch (err) {
    console.error("[createEntry] Error saving entry:", err);
    const error = new HttpError(
      "Creating entry failed, please try again",
      500
    );
    return next(error);
  }

  res.status(201).json({ entry: createdEntry });
};


const updateEntry = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("[updateEntry] Validation errors:", errors.array());
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { headline, journalText } = req.body;
  const entryId = req.params.pid;

  console.log("[updateEntry] Updating entry:", entryId);
  console.log("[updateEntry] New values:", { headline, journalText });

  let entry;
  try {
    entry = await Journal.findById(entryId);
    console.log("[updateEntry] Found entry:", entry);
  } catch (err) {
    console.error("[updateEntry] Error finding entry:", err);
    const error = new HttpError(
      "Something went wrong, could not update entry.",
      500
    );
    return next(error);
  }

  if (!entry) {
    return next(new HttpError("Could not find entry for this id.", 404));
  }

  entry.headline = headline;
  entry.journalText = journalText;

  try {
    await entry.save(); 
    console.log("[updateEntry] Entry saved successfully.");
  } catch (err) {
    console.error("[updateEntry] Error saving entry:", err);
    const error = new HttpError(
      "Something went wrong, could not update entry.",
      500
    );
    return next(error);
  }

  res.status(200).json({ entry: entry.toObject({ getters: true }) });
};


const deleteEntry = async (req, res, next) => {
  const entryId = req.params.pid;

  console.log("[deleteEntry] Deleting entry:", entryId);

  let entry;
  try {
    entry = await Journal.findById(entryId);
  } catch (err) {
    console.error("[deleteEntry] Error finding entry:", err);
    const error = new HttpError(
      "Something went wrong, could not delete entry.",
      500
    );
    return next(error);
  }

  if (!entry) {
    return next(new HttpError("Could not find entry for this id.", 404));
  }

  try {
    await entry.deleteOne();
    console.log("[deleteEntry] Entry deleted.");
  } catch (err) {
    console.error("[deleteEntry] Error deleting entry:", err);
    const error = new HttpError(
      "Something went wrong, could not delete entry.",
      500
    );
    return next(error);
  }

  res.status(200).json({ message: "Deleted entry." });
};

exports.getEntryById = getEntryById;
exports.getEntriesByUserId = getEntriesByUserId;
exports.createEntry = createEntry;
exports.updateEntry = updateEntry;
exports.deleteEntry = deleteEntry;
