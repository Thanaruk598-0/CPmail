const User = require("../models/User");

module.exports = async function (req, res, next) {
    if (req.session.userId) {
        try {
            const user = await User.findById(req.session.userId);
            res.locals.currentUser = user;   // เก็บ user ทั้ง object
            res.locals.userRole = user.role; // เก็บ role แยกไว้ด้วย
        } catch (err) {
            console.error("Error fetching user:", err);
            res.locals.currentUser = null;
            res.locals.userRole = null;
        }
    } else {
        res.locals.currentUser = null;
        res.locals.userRole = null;
    }
    next();
};
