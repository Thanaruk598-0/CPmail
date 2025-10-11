var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var mongoose = require("mongoose");

const { Notification, User } = require("./models");

// Test
const session = require("express-session");

const authRouter = require("./routes/auth");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var studentRouter = require("./routes/studentRoute");
var notificationsRouter = require("./routes/notifications");

var app = express();

var dbURI = "mongodb://127.0.0.1:27017/CPmail_DB";

async function startServer() {
  try {
    await mongoose.connect(dbURI);
    console.log("MongoDB connected");
    app.listen(4000, () => {
      console.log("Server is running on http://localhost:4000");
    });
  } catch (err) {
    console.log(err);
  }
}
startServer();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static("public"));

// test session
app.use(
  session({ secret: "formEaseSecret", resave: false, saveUninitialized: false })
);

app.use((req, res, next) => {
  // ถ้า session มี user ก็ใช้ user นั้น ถ้าไม่มีก็เป็น undefined
  res.locals.currentUser = req.session.user;
  next();
});

// 🔔 GLOBAL notiCount (นับจาก Notification.read:false)
app.use(async (req, res, next) => {
  res.locals.notiCount = 0;           // default กันพัง
  if (!req.session.user) return next();
  try {
    res.locals.notiCount = await Notification.countDocuments({
      user: req.session.user._id,
      read: false,
    });
  } catch (e) {
    // เงียบๆ ไม่ให้พังเพจ
  }
  next();
});

// routers
app.use("/", authRouter);
app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/student", studentRouter);
app.use("/", notificationsRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
