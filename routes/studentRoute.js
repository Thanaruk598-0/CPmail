var express = require("express");
var router = express.Router();
const multer = require("multer");
const path = require("path");
const authMiddleware = require("../middlewares/authMiddleware");
const StudentController = require("../controllers/studentController");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads"),
  filename: (req, file, cb) => {
    const uniqueName = `${req.user._id}_${Date.now()}${path.extname(
      file.originalname
    )}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

router.get("/", authMiddleware, StudentController.getDashboard);

router.get("/profile", authMiddleware, StudentController.getProfile);

router.get("/formhistory", authMiddleware, StudentController.getFormHistory);

router.post(
  "/profile/avatar",
  authMiddleware,
  upload.single("avatar"),
  StudentController.updateAvatar
);
router.post(
  "/profile/update",
  authMiddleware,
  StudentController.updatePersonalInfo
);
router.post(
  "/profile/courses",
  authMiddleware,
  StudentController.updateCourses
);
router.post(
  "/profile/change-password",
  authMiddleware,
  StudentController.changePassword
);

module.exports = router;
