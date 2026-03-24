const express = require("express");
const path = require("path");

const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose").default;

require("dotenv").config();

const app = express();
const PORT = 3000;

// ---------- Middleware ----------
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

// ---------- Sessions ----------
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ---------- Mongo ----------
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ---------- Schemas / Models ----------
// IMPORTANT: Passport expects username + password names
const userSchema = new mongoose.Schema({
  username: String,
  password: String
});

// plugin adds salt/hash fields + helper methods like register()
userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);

const noteSchema = new mongoose.Schema({
  text: String,
  creator: String,     // store username string for now (simple + matches your UI)
  upvotes: [String],   // array of usernames
  downvotes: [String]  // array of usernames
});

const Note = mongoose.model("Note", noteSchema);

// ---------- Passport Strategy ----------
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// ---------- Auth Guard ----------
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.redirect("/");
}

// ---------- Routes ----------

// Login/Register page
app.get("/", (req, res) => {
  res.render("login", { error: null });
});

// Register (must check invite code from .env)
app.post("/register", async (req, res) => {
  try {
    const invite = (req.body["invite-code"] || "").trim();
    if (invite !== process.env.INVITE_CODE) {
      return res.status(400).render("login", { error: "Invalid invite code." });
    }

    const username = (req.body.username || "").trim();
    const password = (req.body.password || "").trim();

    const user = new User({ username });
    await User.register(user, password);

    // auto-login after register
    passport.authenticate("local")(req, res, () => {
      res.redirect("/note-vote");
    });
  } catch (err) {
    console.log(err);
    return res.redirect("/");
  }
});

// Login
app.post("/login", (req, res) => {
  passport.authenticate("local", {
    successRedirect: "/note-vote",
    failureRedirect: "/"
  })(req, res);
});

// Note-vote page (protected, session-based)
app.get("/note-vote", ensureAuthenticated, async (req, res) => {
  const username = req.user.username;

  const posts = await Note.find().lean(); // read from DB (not JSON)
  res.render("note-vote", { username, posts });
});

// Logout
app.get("/logout", (req, res, next) => {
  req.logout(function (err) {
    if (err) return next(err);
    res.redirect("/");
  });
});

// Add post (protected)
app.post("/addpost", ensureAuthenticated, async (req, res) => {
  const username = req.user.username;
  const text = (req.body.text || "").trim();
  if (!text) return res.redirect("/note-vote");

  await Note.create({
    text,
    creator: username,
    upvotes: [],
    downvotes: []
  });

  res.redirect("/note-vote");
});

// Upvote toggle (protected)
app.post("/upvote", ensureAuthenticated, async (req, res) => {
  const username = req.user.username;
  const postId = req.body.postId;

  const post = await Note.findById(postId);
  if (!post) return res.redirect("/note-vote");

  // optional: prevent voting own posts
  if (post.creator === username) return res.redirect("/note-vote");

  const upvoted = post.upvotes.includes(username);
  const downvoted = post.downvotes.includes(username);

  if (upvoted) {
    post.upvotes = post.upvotes.filter((u) => u !== username); // remove upvote
  } else {
    post.upvotes.push(username);                               // add upvote
    if (downvoted) post.downvotes = post.downvotes.filter((u) => u !== username); // remove downvote
  }

  await post.save();
  res.redirect("/note-vote");
});

// Downvote toggle (protected)
app.post("/downvote", ensureAuthenticated, async (req, res) => {
  const username = req.user.username;
  const postId = req.body.postId;

  const post = await Note.findById(postId);
  if (!post) return res.redirect("/note-vote");

  if (post.creator === username) return res.redirect("/note-vote");

  const upvoted = post.upvotes.includes(username);
  const downvoted = post.downvotes.includes(username);

  if (downvoted) {
    post.downvotes = post.downvotes.filter((u) => u !== username); // remove downvote
  } else {
    post.downvotes.push(username);                                 // add downvote
    if (upvoted) post.upvotes = post.upvotes.filter((u) => u !== username); // remove upvote
  }

  await post.save();
  res.redirect("/note-vote");
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});