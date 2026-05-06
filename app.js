const express = require("express");
const path = require("path");

const app = express();

app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index");
});

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});