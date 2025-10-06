var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const session = require("express-session");
const detectUser = require("./middleware/detectUser");
var flash = require("connect-flash");
var mongoose = require("mongoose");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const featureRoutes = require("./routes/feature");
const contactRoutes = require("./routes/contact");
const aboutRoutes = require("./routes/about");
const homeRoutes = require("./routes/home");

const adminRoutes = require("./routes/admin");
const lecturerRoutes = require("./routes/lecturer");

var app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// MongoDB connect
var dbURI = "mongodb://127.0.0.1:27017/CPmail_DB";
async function startServer() {
  try {
    await mongoose.connect(dbURI);
    console.log("✅ MongoDB connected");
    app.listen(4000, () => {
      console.log("🚀 Server is running on http://localhost:4000");
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

// session
app.use(session({
  secret: "mySecretKey",
  resave: false,
  saveUninitialized: false
}));

app.use(detectUser);
app.use(require("./middleware/detectUser"));
app.use(flash());

// flash msg middleware
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  next();
});

// routers
app.use("/", indexRouter);
app.use("/", authRoutes); 
app.use("/", userRoutes); 
app.use("/", aboutRoutes);
app.use("/", featureRoutes);
app.use("/", contactRoutes);
app.use("/", homeRoutes);
app.use("/", adminRoutes);
app.use("/", lecturerRoutes);
app.use("/users", usersRouter);

// catch 404
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(err.status || 500);
  res.render("error");
});


module.exports = app;
