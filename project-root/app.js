const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

// Middleware (MUST come before routes)
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

//  EJS 
app.set("view engine", "ejs");

//  Constants 
const INVITE_CODE = "Note Vote 2026";
const USERS_PATH = path.join(__dirname, "users.json");
const POSTS_PATH = path.join(__dirname, "posts.json");

// ----- Helper functions (Model I/O) -------
function loadUsers() {
  if (!fs.existsSync(USERS_PATH)) return [];
  return JSON.parse(fs.readFileSync(USERS_PATH, "utf8"));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2), "utf8");
}

function loadPosts() {
  if (!fs.existsSync(POSTS_PATH)) return [];
  return JSON.parse(fs.readFileSync(POSTS_PATH, "utf8"));
}

function savePosts(posts) {
  fs.writeFileSync(POSTS_PATH, JSON.stringify(posts, null, 2), "utf8");
}

// Utility: find post by id
function findPost(posts, id) {
  return posts.find(p => String(p._id) === String(id));
}

// Utility: remove item from array (returns new array)
function without(arr, value) {
  return arr.filter(x => x !== value);
}

// --- Routes ----

// GET /  -> render login page
app.get("/", (req, res) => {
  res.render("login", { error: null });
});

// POST /login -> check username+password, then redirect(307) to /note-vote
app.post("/login", (req, res) => {
  const username = (req.body.email || "").trim();     // your login form uses name="email"
  const password = (req.body.password || "").trim();

  const users = loadUsers();
  const match = users.find(u => u.username === username && u.password === password);

  if (!match) {
    return res.status(401).render("login", { error: "Invalid username or password." });
  }

  // preserve POST body for /note-vote
  req.body.username = username;
  return res.redirect(307, "/note-vote");
});

// POST /register -> validate invite code, create user, redirect(307) to /note-vote
app.post("/register", (req, res) => {
  const username = (req.body.email || "").trim();     // your register form uses name="email"
  const password = (req.body.password || "").trim();
  const invite = (req.body["invite-code"] || "").trim();

  if (invite !== INVITE_CODE) {
    return res.status(400).render("login", { error: "Invalid invite code." });
  }

  const users = loadUsers();
  const exists = users.some(u => u.username === username);
  if (exists) {
    return res.status(409).render("login", { error: "That username is already registered." });
  }

  users.push({ username, password });
  saveUsers(users);

  req.body.username = username;
  return res.redirect(307, "/note-vote");
});

// POST /note-vote -> render the note-vote page with username + posts
app.post("/note-vote", (req, res) => {
  const username = (req.body.username || req.body.email || "").trim();
  if (!username) {
    return res.redirect("/");
  }

  const posts = loadPosts();

  res.render("note-vote", {
    username,
    posts
  });
});

// GET /logout -> back to login
app.get("/logout", (req, res) => {
  res.redirect("/");
});

// POST /addpost -> add new post then redirect(307) to /note-vote
app.post("/addpost", (req, res) => {
  const username = (req.body.username || "").trim();
  const text = (req.body.text || "").trim();
  if (!username || !text) return res.redirect("/");

  const posts = loadPosts();
  const nextId = posts.length ? Math.max(...posts.map(p => Number(p._id))) + 1 : 1;

  posts.push({
    _id: nextId,
    text,
    creator: username,
    upvotes: [],
    downvotes: []
  });

  savePosts(posts);

  // preserve username on redirect
  req.body.username = username;
  return res.redirect(307, "/note-vote");
});

// POST /upvote -> toggle upvote, handle edge cases, redirect back
app.post("/upvote", (req, res) => {
  const username = (req.body.username || "").trim();
  const postId = req.body.postId;
  if (!username || !postId) return res.redirect("/");

  const posts = loadPosts();
  const post = findPost(posts, postId);
  if (!post) return res.redirect("/");

  // cannot vote on your own post (optional but usually expected)
  if (post.creator === username) {
    req.body.username = username;
    return res.redirect(307, "/note-vote");
  }

  const upvoted = post.upvotes.includes(username);
  const downvoted = post.downvotes.includes(username);

  if (upvoted) {
    // remove upvote
    post.upvotes = without(post.upvotes, username);
  } else {
    // add upvote, and if downvoted remove downvote
    post.upvotes.push(username);
    if (downvoted) post.downvotes = without(post.downvotes, username);
  }

  savePosts(posts);
  req.body.username = username;
  return res.redirect(307, "/note-vote");
});

// POST /downvote -> toggle downvote, handle edge cases, redirect back
app.post("/downvote", (req, res) => {
  const username = (req.body.username || "").trim();
  const postId = req.body.postId;
  if (!username || !postId) return res.redirect("/");

  const posts = loadPosts();
  const post = findPost(posts, postId);
  if (!post) return res.redirect("/");

  if (post.creator === username) {
    req.body.username = username;
    return res.redirect(307, "/note-vote");
  }

  const upvoted = post.upvotes.includes(username);
  const downvoted = post.downvotes.includes(username);

  if (downvoted) {
    // remove downvote
    post.downvotes = without(post.downvotes, username);
  } else {
    // add downvote, and if upvoted remove upvote
    post.downvotes.push(username);
    if (upvoted) post.upvotes = without(post.upvotes, username);
  }

  savePosts(posts);
  req.body.username = username;
  return res.redirect(307, "/note-vote");
});

// ---------- Start server ----------
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
``