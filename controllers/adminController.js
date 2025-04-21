const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Cab = require("../models/Cab");
const Driver = require("../models/loginModel");
require("dotenv").config();
const Expense = require("../models/subAdminExpenses");
const Analytics = require("../models/SubadminAnalytics");
const nodemailer = require("nodemailer");
const crypto = require('crypto');


// ✅ Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


// ✅ Register Admin
const registerAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if admin already exists
    let existingAdmin = await Admin.findOne({ email });
    if (existingAdmin)
      return res.status(400).json({ message: "Admin already registered" });

    // ✅ Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({ email, password: hashedPassword });

    await newAdmin.save();

    res.status(201).json({ message: "Admin registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// ✅ Sub-Admin Login
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if admin exists
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    // ✅ Check if blocked
    if (admin.status === "Blocked") {
      return res
        .status(403)
        .json({ message: "Your account is blocked. Contact admin." });
    }

  

    // ✅ Compare hashed password with entered password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    // ✅ Generate JWT token
    const token = jwt.sign(
      { id: admin._id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "10d" }
    );

    res.status(200).json({ message: "Login successful!", token ,id:admin._id});
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

const totalSubAdminCount = async (req, res) => {
  try {
    // If you are counting admin documents
    const subAdminCount = await Admin.countDocuments(); // Ensure this is the correct model for the task

    res.status(200).json({ count: subAdminCount }); // ✅ Send correct response
  } catch (error) {
    res.status(500).json({ message: "Error counting sub-admins" });
  }
};

const totalDriver = async (req, res) => {
  try {
    // If you are counting admin documents
    const driver = await Driver.countDocuments(); // Ensure this is the correct model for the task

    res.status(200).json({ count: driver }); // ✅ Send correct response
  } catch (error) {
    res.status(500).json({ message: "Error counting sub-admins" });
  }
};

const totalCab = async (req, res) => {
  try {
    // If you are counting admin documents
    const cab = await Cab.countDocuments(); // Ensure this is the correct model for the task

    res.status(200).json({ count: cab }); // ✅ Send correct response
  } catch (error) {
    res.status(500).json({ message: "Error counting sub-admins" });
  }
};

// Get all sub-admins
const getAllSubAdmins = async (req, res) => {
  try {
    const subAdmins = await Admin.find()
      .select("-password")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, subAdmins });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch sub-admins",
      error: error.message,
    });
  }
};



// Invoice number generator
const generateInvoiceNumber = (subadminName) => {
  if (!subadminName) return "NA-000000";

  const namePrefix = subadminName.trim().split(" ").map((word) => word[0]).join("").toUpperCase().slice(0, 3); // E.g., Radiant IT Service → RIS
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear() % 100;
  const nextYear = (now.getFullYear() + 1) % 100;
  const financialYear =currentMonth >= 4 ? `${currentYear}${nextYear}` : `${(currentYear - 1).toString().padStart(2, "0")}${currentYear}`;
  const randomNumber = Math.floor(100000 + Math.random() * 900000);
  return `${namePrefix}${financialYear}-${randomNumber}`;
};

// Controller to add a new sub-admin
const addNewSubAdmin = async (req, res) => {
  try {
    const { name, email, role, phone, status, companyInfo } = req.body;

    const profileImage = req.files?.profileImage?.[0]?.path || null;
    const companyLogo = req.files?.companyLogo?.[0]?.path || null;
    const signature = req.files?.signature?.[0]?.path || null;

    // Basic validation
    if (!name || !email || !role || !phone || !companyInfo) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided.",
      });
    }

    // Check for existing email
    const existingSubAdmin = await Admin.findOne({ email });
    if (existingSubAdmin) {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }

    // Generate and hash password
    const generatedPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Create subadmin
    const newSubAdmin = await Admin.create({
      profileImage,
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      status: status || "Active",
      companyLogo,
      companyInfo,
      signature,
    });

    // Optionally generate invoice number (if needed for display or testing)
    const invoiceNumber = generateInvoiceNumber(newSubAdmin.name); // ✅ Correct

    // Send welcome email
    const mailOptions = {
      from:`"WTL Tourism Pvt. Ltd." <contact@worldtriplink.com>`,
      to: email,
      subject: "Welcome to WTL Tourism - Sub-Admin Account Created",
      html: `
        <div style="max-width: 600px; margin: auto; font-family: Arial, sans-serif;">
          <div style="text-align: center; padding-bottom: 20px;">
            ${companyLogo ? `<img src="${companyLogo}" alt="Company Logo" style="max-width: 120px;">` : ""}
          </div>
          <h2 style="text-align: center; color: #333;">Sub-Admin Account Created</h2>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> ${generatedPassword}</p>
          <p>Please log in and change your password after first login.</p>
          <br>
          <div style="text-align: center;">
            <a href="http://localhost:3000/" style="background: #007BFF; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">Login Now</a>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    // Return response without password
    const { password: _, ...subAdminResponse } = newSubAdmin.toObject();

    return res.status(201).json({
      success: true,
      message: "Sub-admin created successfully",
      newSubAdmin: subAdminResponse,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to add sub-admin",
      error: error.message,
    });
  }
};


// Get a single sub-admin by ID
const getSubAdminById = async (req, res) => {
  try {
    const subAdmin = await Admin.findById(req.params.id).select("-password");

    if (!subAdmin) {
      return res
        .status(404)
        .json({ success: false, message: "Sub-admin not found" });
    }

    res.status(200).json({ success: true, subAdmin });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch sub-admin",
      error: error.message,
    });
  }
};

const updateSubAdmin = async (req, res) => {
  try {
    const { name, email, password, role, phone, status, profileImage } =
      req.body;
    const subAdminId = req.params.id;

    // Check if email is being changed and if it already exists
    if (email) {
      const existingSubAdmin = await Admin.findOne({
        email,
        _id: { $ne: subAdminId },
      });
      if (existingSubAdmin) {
        return res.status(400).json({
          success: false,
          message: "Email already in use by another sub-admin",
        });
      }
    }

    // Prepare update data
    const updateData = {
      name,
      email,
      role,
      phone,
      status,
    };

    // Only include profileImage if it's provided
    if (profileImage !== undefined) {
      updateData.profileImage = profileImage;
    }

    // Only update password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    // Update sub-admin
    const updatedSubAdmin = await Admin.findByIdAndUpdate(
      subAdminId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedSubAdmin) {
      return res
        .status(404)
        .json({ success: false, message: "Sub-admin not found" });
    }

    res.status(200).json({
      success: true,
      message: "Sub-admin updated successfully",
      subAdmin: updatedSubAdmin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update sub-admin",
      error: error.message,
    });
  }
};

const deleteSubAdmin = async (req, res) => {
  try {
    // Find and delete the sub-admin
    const deletedSubAdmin = await Admin.findByIdAndDelete(req.params.id);

    if (!deletedSubAdmin) {
      return res.status(404).json({ success: false, message: "Sub-admin not found" });
    }

    // Delete related cabs and drivers (assuming cab and driver are related to sub-admin)
    const deletedCabs = await Cab.deleteMany({ addedBy: req.params.id }); // Modify based on your schema
    const deletedDrivers = await Driver.deleteMany({ addedBy: req.params.id }); // Modify based on your schema

    // Check if related cabs and drivers are deleted
    const relatedDataDeleted = deletedCabs.deletedCount > 0 || deletedDrivers.deletedCount > 0;

    // If no related cabs or drivers are deleted, it's still fine to delete the sub-admin
    if (!relatedDataDeleted) {
    }

    // Send success response
    res.status(200).json({
      success: true,
      message: "Sub-admin and related cabs and drivers deleted successfully, if any",
      deletedSubAdmin,
      deletedCabs,
      deletedDrivers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete sub-admin and related data",
      error: error.message,
    });
  }
};


// Toggle block status
const toggleBlockStatus = async (req, res) => {
  try {
    const subAdmin = await Admin.findById(req.params.id);

    if (!subAdmin) {
      return res
        .status(404)
        .json({ success: false, message: "Sub-admin not found" });
    }

    // Toggle status
    const newStatus = subAdmin.status === "Active" ? "Inactive" : "Active";

    const updatedSubAdmin = await Admin.findByIdAndUpdate(
      req.params.id,
      { $set: { status: newStatus } },
      { new: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      message: `Sub-admin ${newStatus === "Active" ? "activated" : "deactivated"
        } successfully`,
      status: newStatus,
      subAdmin: updatedSubAdmin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update sub-admin status",
      error: error.message,
    });
  }
};

// expense
const addExpense = async (req, res) => {
  try {
    const { type, amount, driver, cabNumber } = req.body;

    const newExpense = new Expense({ type, amount, driver, cabNumber });

    await newExpense.save();

    res.status(201).json(newExpense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all expenses
const getAllExpenses = async (req, res) => {
  try {
    // Fetch all cabs added by this admin
    const cabs = await Cab.find();

    if (cabs.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No cabs found for this admin." });
    }


    // Manually calculate total expenses
    const expenses = cabs.map((cab) => {
      const totalExpense =
        (cab.fuel?.amount || 0) +
        (cab.fastTag?.amount || 0) +
        (cab.tyrePuncture?.repairAmount || 0) +
        (cab.otherProblems?.amount || 0);

      return {
        cabNumber: cab.cabNumber,
        totalExpense,
        breakdown: {
          fuel: cab.fuel?.amount || 0,
          fastTag: cab.fastTag?.amount || 0,
          tyrePuncture: cab.tyrePuncture?.repairAmount || 0,
          otherProblems: cab.otherProblems?.amount || 0,
        },
      };
    });

    // Sort by highest expense first
    expenses.sort((a, b) => b.totalExpense - a.totalExpense);


    if (expenses.length === 0) {
      return res
        .status(404)
        .json({
          success: false,
          message: "No expenses found after calculation!",
        });
    }

    res.status(200).json({ success: true, data: expenses });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Delete an expense
const deleteExpense = async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: "Expense deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update an expense
const updateExpense = async (req, res) => {
  try {
    const { type, amount, driver, cabNumber } = req.body;
    const updatedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      { type, amount, driver, cabNumber },
      { new: true, runValidators: true }
    );

    if (!updatedExpense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json(updatedExpense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all analytics data
const getAnalytics = async (req, res) => {
  try {
    const data = await Analytics.find().sort({ date: -1 }).limit(10);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// Add new analytics data
const addAnalytics = async (req, res) => {
  try {
    const { totalRides, revenue, customerSatisfaction, fleetUtilization } =
      req.body;
    const newEntry = new Analytics({
      totalRides,
      revenue,
      customerSatisfaction,
      fleetUtilization,
    });
    await newEntry.save();
    res.status(201).json(newEntry);
  } catch (error) {
    res.status(500).json({ message: "Error adding data" });
  }
};

// ✅ Export all functions correctly
module.exports = {
  registerAdmin,
  adminLogin,
  totalSubAdminCount,
  getAllSubAdmins,
  addNewSubAdmin,
  getSubAdminById,
  updateSubAdmin,
  deleteSubAdmin,
  toggleBlockStatus,
  totalDriver,
  totalCab,
  addExpense,
  getAllExpenses,
  deleteExpense,
  updateExpense,
  getAnalytics,
  addAnalytics,
};