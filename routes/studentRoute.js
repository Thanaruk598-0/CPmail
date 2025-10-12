var express = require("express");
var router = express.Router();
const multer = require("multer");
const path = require("path");
const authMiddleware = require("../middlewares/authMiddleware");
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

router.get("/", authMiddleware, StudentController.getDashboard);

router.get("/profile", authMiddleware, StudentController.getProfile);

router.get("/formhistory", authMiddleware, StudentController.getFormHistory);
router.get("/formhistory/data", authMiddleware, StudentController.getFormHistoryData);

//หน้า “รายละเอียดฟอร์ม”
router.get("/forms", authMiddleware, StudentController.getFormDetail);

//บันทึกการแก้ไข (บาง field)
router.post("/forms/:id/update", authMiddleware, StudentController.postUpdateForm);

//ยกเลิกฟอร์ม
router.post("/forms/:id/cancel", authMiddleware, StudentController.postCancelForm);

router.get("/forms/:id/pdf", authMiddleware, StudentController.exportFormPdf);

// ==============================
// เส้นทาง “ยื่นฟอร์มใหม่” 3 สเตป
// STEP 1: เลือกเทมเพลต
router.get("/forms/submit", authMiddleware, FormController.getSubmitStep1);

// STEP 2: กรอกรายละเอียด (GET/POST ก็ได้ แต่เราทำเป็น GET แสดงฟอร์ม, POST ส่งไป Preview)
router.get("/forms/submit/details", authMiddleware, FormController.getSubmitStep2);

// STEP 3: Preview & Submit (รับ POST จาก step2)
router.post("/forms/submit/preview", authMiddleware, FormController.postPreview);

// FINAL: สร้างจริง
router.post("/forms/submit/create", authMiddleware, FormController.postCreate);
// ==============================

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
