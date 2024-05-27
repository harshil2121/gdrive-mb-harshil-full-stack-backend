const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    googleId: { type: String, default: null },
    token: { type: String, default: null },
    refreshToken: { type: String, default: null },
    email: { type: String, default: null },
    first_name: { type: String, default: null },
    last_name: { type: String, default: null },
    jobtitle: { type: String, default: null },
    country: { type: String, default: null },
    company_name: { type: String, default: null },
    phone: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", UserSchema);
