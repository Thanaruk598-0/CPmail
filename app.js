require("dotenv").config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const session = require("express-session");
const detectUser = require("./middleware/detectUser");
const mongoose = require("mongoose");
var flash = require("connect-flash");

const { Notification, User } = require("./models");

var indexRouter = require('./routes/index');
var usersRouters = require('./routes/users');
//login
const userloginRoutes = require("./routes/user");

const manageUserRouter = require('./routes/manageUser');

const manageCourseRouter = require('./routes/manageCourse');

const Dashboard = require('./routes/adminDashboard');

const lectureDashboard  = require('./routes/lecturer/lectureDashboard');
const lecturerReportRoutes = require("./routes/lecturer/reports");
const lecturerRouter = require('./routes/lecturer/formHistory');

//fai
const authRoutes = require("./routes/auth");

//b
const announcements = require('./routes/announcements');
const reviewRouter = require('./routes/lecturer/review');

//ef
const formTemplateRoutes = require("./routes/formTemplates");
const viewTemplatesRouter = require("./routes/viewtemplates");

//notification
var notificationsRouter = require("./routes/notifications");

//student
var studentRouter = require("./routes/studentRoute");


var app = express();

mongoose.connect("mongodb://localhost:27017/CPmail")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());

console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "Loaded ✅" : "Not found ❌");

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use(session({
  secret: "yoursecretkey",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 60 * 1000 // 30 นาที (millisecond)
  }
}));
app.use(detectUser);
app.use(flash());

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

// Router ตาม path ที่เลือก
app.use('/', indexRouter);            // หน้าแรก
app.use('/users', usersRouters);      // /users/*
app.use('/user', userloginRoutes); 
app.use('/manageUser', manageUserRouter);
app.use('/manageCourse', manageCourseRouter);

app.use('/Dashboard', Dashboard);
app.use('/lectureDashboard', lectureDashboard);
app.use("/lecturer/reports", lecturerReportRoutes);
app.use("/history", lecturerRouter);


app.use("/", authRoutes);

app.use("/student", studentRouter);

app.use('/lecturer/announcements', announcements);
app.use('/lecturers', reviewRouter);

app.use("/form-templates", formTemplateRoutes);

app.use("/allteplaetes", viewTemplatesRouter);
app.use("/", notificationsRouter);

app.use('/bootstrap', express.static(__dirname + '/node_modules/bootstrap/dist'));
app.use('/icons', express.static(__dirname + '/node_modules/bootstrap-icons/font'));


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});


// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: req.app.get('env') === 'development' ? err : {} // <-- ส่ง error เข้าไป
  });
});

module.exports = app;