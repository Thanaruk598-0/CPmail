var express = require("express");
var router = express.Router();
const multer = require("multer");
const path = require("path");
const checkStudent = require('../middleware/checkStudent');
const StudentController = require("../controllers/studentController");
const FormController = require("../controllers/formController");

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

router.get("/", checkStudent, StudentController.getDashboard);

router.get("/profile", checkStudent, StudentController.getProfile);

router.get("/formhistory", checkStudent, StudentController.getFormHistory);
router.get("/formhistory/data", checkStudent, StudentController.getFormHistoryData);

//หน้า “รายละเอียดฟอร์ม”
router.get("/forms", checkStudent, StudentController.getFormDetail);

//บันทึกการแก้ไข (บาง field)
router.post("/forms/:id/update", checkStudent, StudentController.postUpdateForm);

//ยกเลิกฟอร์ม
router.post("/forms/:id/cancel", checkStudent, StudentController.postCancelForm);

// ==============================
// เส้นทาง “ยื่นฟอร์มใหม่” 3 สเตป
// STEP 1: เลือกเทมเพลต
router.get("/forms/submit", checkStudent, FormController.getSubmitStep1);

// STEP 2: กรอกรายละเอียด (GET/POST ก็ได้ แต่เราทำเป็น GET แสดงฟอร์ม, POST ส่งไป Preview)
router.get("/forms/submit/details", checkStudent, FormController.getSubmitStep2);

// STEP 3: Preview & Submit (รับ POST จาก step2)
router.post("/forms/submit/preview", checkStudent, FormController.postPreview);

// FINAL: สร้างจริง
router.post("/forms/submit/create", checkStudent, FormController.postCreate);
// ==============================

router.post(
  "/profile/avatar",
  checkStudent,
  upload.single("avatar"),
  StudentController.updateAvatar
);
router.post(
  "/profile/update",
  checkStudent,
  StudentController.updatePersonalInfo
);
router.post(
  "/profile/courses",
  checkStudent,
  StudentController.updateCourses
);
router.post(
  "/profile/change-password",
  checkStudent,
  StudentController.changePassword
);

module.exports = router;
