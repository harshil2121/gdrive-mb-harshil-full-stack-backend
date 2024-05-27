const mongoose = require("mongoose");
const URL = process.env.MONGO_URI;

mongoose
  .connect(URL)
  .then(() => {
    console.log("MongoDB connected successfully!");
  })
  .catch((error) => {
    console.error("MongoDB connection error:==-==>", error);
  });

const db = mongoose.connection;

module.exports = db;
