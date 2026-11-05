import { Router } from "express";
import { requireSession } from "../middleware/requireSession.js";
import { trainingRecords } from "../records.js";

export const recordsRouter = Router();

recordsRouter.get("/:recordId", requireSession, (req, res) => {
  const authenticatedUserId = req.authenticatedUser?.userId;

  // Defense in depth: never continue to the record lookup without a principal.
  if (!authenticatedUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Equivalent to a database query filtered by BOTH object ID and owner ID.
  // Returning the same 404 for absent and non-owned records avoids disclosing
  // whether another user's record exists.
  const record = trainingRecords.find(
    (candidate) =>
      candidate.id === req.params.recordId &&
      candidate.ownerId === authenticatedUserId,
  );

  if (!record) {
    res.status(404).json({ error: "Record not found" });
    return;
  }

  const { ownerId: _ownerId, ...publicRecord } = record;
  res.status(200).json(publicRecord);
});
