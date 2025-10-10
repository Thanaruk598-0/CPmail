const express = require("express");
const router = express.Router();

// Mock Data (จำลอง)
const mockForms = [
  {
    _id: "1",
    formId: "F2024001",
    template: { title: "Course Evaluation - CS101", category: "Evaluation" },
    submitter: { 
      name: "John Smith", 
      email: "john.smith@example.com", 
      role: "student",
      avatarUrl: "https://i.pravatar.cc/32?u=student1"
    },
    submittedAt: new Date("2025-01-20T10:30:00"),
    status: "approved"
  },
  {
    _id: "2",
    formId: "F2024002",
    template: { title: "Leave Request - Annual Leave", category: "Request" },
    submitter: { 
      name: "Sarah Johnson", 
      email: "sarah.j@example.com", 
      role: "lecturer",
      avatarUrl: "https://i.pravatar.cc/32?u=lecturer1"
    },
    submittedAt: new Date("2025-01-22T09:15:00"),
    status: "pending"
  },
  {
    _id: "3",
    formId: "F2024003",
    template: { title: "Admin Internal Report", category: "Administrative" },
    submitter: { 
      name: "Admin User", 
      email: "admin@example.com", 
      role: "staff",
      avatarUrl: "https://i.pravatar.cc/32?u=staff1"
    },
    submittedAt: new Date("2025-01-25T15:45:00"),
    status: "rejected"
  }
];

// Route สำหรับ mock
router.get("/", (req, res) => {
  const query = req.query;
  const page = parseInt(query.page) || 1;
  const totalPages = 1;

  res.render("AllForms/ViewAllForm", { 
    forms: mockForms, 
    query, 
    page, 
    totalPages, 
    currentUser: { name: "Mock Admin", role: "admin" } 
  });
});

module.exports = router;
