const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let items = [];

// GET
app.get("/api/items", (req, res) => {
  res.json(items);
});

// POST
app.post("/api/items", (req, res) => {
  const item = {
    id: Date.now().toString(),
    ...req.body
  };
  items.push(item);
  res.json(item);
});

// DELETE
app.delete("/api/items/:id", (req, res) => {
  items = items.filter(item => item.id !== req.params.id);
  res.json({ message: "Deleted" });
});

app.listen(8080, () => {
  console.log("Server running on http://localhost:8080");
});