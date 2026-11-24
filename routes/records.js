const router = require("express").Router();
const db = require("../db");

const STATUSES = ["Pending", "In progress", "Completed"];

function validateRecord(body) {
  const errors = [];
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const status = typeof body.status === "string" ? body.status.trim() : "";

  if (title.length < 3 || title.length > 80) errors.push("Title must have 3 to 80 characters.");
  if (category.length < 2 || category.length > 40) errors.push("Category must have 2 to 40 characters.");
  if (description.length < 5 || description.length > 300) errors.push("Description must have 5 to 300 characters.");
  if (!STATUSES.includes(status)) errors.push("Status must be Pending, In progress, or Completed.");

  return { errors, values: { title, category, description, status } };
}

function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

// GET all
router.get("/", (req, res, next) => {
  try {
    const rows = db.prepare("SELECT id, title, category, description, status FROM records ORDER BY id").all();
    res.status(200).json(rows);
  } catch (error) { next(error); }
});

// GET one
router.get("/:id", (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ message: "ID must be a positive whole number." });
    const row = db.prepare("SELECT id, title, category, description, status FROM records WHERE id = ?").get(id);
    if (!row) return res.status(404).json({ message: "Record not found." });
    res.status(200).json(row);
  } catch (error) { next(error); }
});

// POST create
router.post("/", (req, res, next) => {
  try {
    const { errors, values } = validateRecord(req.body || {});
    if (errors.length > 0) return res.status(400).json({ message: errors[0] });
    
    const info = db.prepare("INSERT INTO records (title, category, description, status) VALUES (?, ?, ?, ?)")
      .run(values.title, values.category, values.description, values.status);
      
    const created = db.prepare("SELECT id, title, category, description, status FROM records WHERE id = ?").get(info.lastInsertRowid);
    res.status(201).json(created);
  } catch (error) { next(error); }
});

// PUT update
router.put("/:id", (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ message: "ID must be a positive whole number." });
    
    const { errors, values } = validateRecord(req.body || {});
    if (errors.length > 0) return res.status(400).json({ message: errors[0] });
    
    const info = db.prepare("UPDATE records SET title = ?, category = ?, description = ?, status = ? WHERE id = ?")
      .run(values.title, values.category, values.description, values.status, id);
      
    if (info.changes === 0) return res.status(404).json({ message: "Record not found." });
    
    const updated = db.prepare("SELECT id, title, category, description, status FROM records WHERE id = ?").get(id);
    res.status(200).json(updated);
  } catch (error) { next(error); }
});

// DELETE
router.delete("/:id", (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ message: "ID must be a positive whole number." });
    
    const info = db.prepare("DELETE FROM records WHERE id = ?").run(id);
    if (info.changes === 0) return res.status(404).json({ message: "Record not found." });
    
    res.status(200).json({ message: "Record deleted." });
  } catch (error) { next(error); }
});

module.exports = router;