import type { RequestHandler } from "express";
import { trainingRecords } from "../src/records.js";

/** Intentionally vulnerable example. This handler is not mounted by the app. */
export const vulnerableRecordHandler: RequestHandler = (req, res) => {
  // Flaw: a blind lookup uses only the caller-controlled record ID.
  const record = trainingRecords.find(
    (candidate) => candidate.id === req.params.recordId,
  );

  if (!record) {
    res.status(404).json({ error: "Record not found" });
    return;
  }

  // No session check and no comparison with the authenticated record owner.
  res.status(200).json(record);
};
