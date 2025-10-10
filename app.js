var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const session = require("express-session");
const detectUser = require("./middleware/detectUser");
const mongoose = require("mongoose");


var indexRouter = require('./routes/index');
var usersRouters = require('./routes/users');
//login
const userloginRoutes = require("./routes/user");

const manageUserRouter = require('./routes/manageUser');

const manageCourseRouter = require('./routes/manageCourse');

const formTemplateRoutes = require("./routes/formTemplates"); // ← ไฟล์ router ที่คุณส่งมา

const createTemplateRouter = require("./routes/createtemplates");

const formRoutes = require("./routes/forms");

const viewTemplatesRouter = require("./routes/viewtemplates"); // <<<< เพิ่มตรงนี้






var app = express();

mongoose.connect("mongodb://localhost:27017/CPmail")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

  


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use("/forms", formRoutes);
app.use("/viewtemplates", viewTemplatesRouter); 



app.use(session({
  secret: "yoursecretkey",
  resave: false,
  saveUninitialized: false
}));
app.use(detectUser);

// Router ตาม path ที่เลือก
app.use('/', indexRouter);            // หน้าแรก
app.use('/users', usersRouters);      // /users/*
app.use('/user', userloginRoutes); 
app.use('/manageUser', manageUserRouter);
app.use('/manageCourse', manageCourseRouter);
app.use("/form-templates", formTemplateRoutes);
app.use("/ALLTEMPLAETES", viewTemplatesRouter);


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
  res.render('error');
});




module.exports = app;
