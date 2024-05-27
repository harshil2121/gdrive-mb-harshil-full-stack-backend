const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const db = require("./src/db/connection");
const port = process.env.PORT;
const session = require("express-session");

app.use(cors());
app.use(express.json());

app.use(
  session({
    secret: "drive_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

// Define routes
const routerUser = require("./src/routes/userRoutes");
app.use("/api/auth", routerUser);

// Start the server
app.listen(port, () => console.log(`BACK_END_SERVICE_PORT: ${port}`));

// Database connection error handling
db.on("error", console.error.bind(console, "MongoDB connection error:"));
