const express = require("express");
const path = require("path");

const app = express();

app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/contact", (req, res) => {
    res.render("contact");
});

app.get("/dashboard", (req, res) => {
    res.render("dashboard");
});

app.get("/admin/events", (req, res) => {
    res.render("admin-events");
});

app.get("/events/:id", (req, res) => {
    res.render("event-details");
});

app.get("/admin/events/create", (req, res) => {
    res.render("event-form");
});

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});