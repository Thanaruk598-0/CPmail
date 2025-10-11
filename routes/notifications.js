const express = require("express");
const router = express.Router();

const Notification = require("../models/Notification");
const authMiddleware = require("../middlewares/authMiddleware");

// GET /notifications — list แจ้งเตือนของ user
router.get("/notifications", authMiddleware, async (req, res) => {
    try {
        const me = res.locals.currentUser;
        if (!me) return res.redirect("/user/login");

        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const PAGE_SIZE = 20;

        const [items, total, unreadCount] = await Promise.all([
            Notification.find({ user: me._id })
                .sort({ read: 1, createdAt: -1 })
                .skip((page - 1) * PAGE_SIZE)
                .limit(PAGE_SIZE)
                .lean(),
            Notification.countDocuments({ user: me._id }),
            Notification.countDocuments({ user: me._id, read: false }),
        ]);

        res.render("notifications", {
            user: me,
            notifications: items,
            total,
            unreadCount,
            // notiCount: unreadCount, // <- ไม่จำเป็นถ้ามี global middlewareแล้ว
            page,
            totalPages: Math.max(Math.ceil(total / PAGE_SIZE), 1),
            activeMenu: "notifications",
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error: " + err.message);
    }
});

// POST /notifications/:id/read — mark as read
router.post("/notifications/:id/read", authMiddleware, async (req, res) => {
    try {
        const me = res.locals.currentUser;
        await Notification.updateOne(
            { _id: req.params.id, user: me._id },
            { $set: { read: true } }
        );
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// (ใหม่) GET /notifications/unread-count — ใช้อัปเดต badge แบบสดๆ
router.get("/notifications/unread-count", authMiddleware, async (req, res) => {
    try {
        const me = res.locals.currentUser;
        const unread = await Notification.countDocuments({ user: me._id, read: false });
        res.json({ unread });
    } catch (err) {
        res.status(500).json({ unread: 0 });
    }
});

// Dev-only: ดูข้อมูลดิบ
router.get("/test-notifications", async (req, res) => {
    try {
        const data = await Notification.find().populate("user", "name email");
        res.json(data);
    } catch (err) {
        res.status(500).send("Error: " + err.message);
    }
});

module.exports = router;
