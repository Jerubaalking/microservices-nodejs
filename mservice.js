const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");
const { Sequelize, DataTypes } = require("sequelize");
const { myEmitter, CachedEvent } = require("./eventListener.js");
const exphbs = require("express-handlebars").create({
  extname: ".hbs",
  defaultLayout: "layout",
  layoutsDir: path.join(__dirname, 'views/layouts'), // Directory where layout files are stored
});
const app = express();
const port = 8000;
const secretKey = "your-secret-key";

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(cors());
// Set 'views' directory and configure Handlebars engine
app.set("views", path.join(__dirname, "views"));
app.engine("hbs", exphbs.engine);
app.set("view engine", "hbs");

// Sequelize setup
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "database.sqlite", // SQLite database file
});

// ... (previous code)

// Define the User model
const User = sequelize.define("User", {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

// Define the App model
const App = sequelize.define("App", {
  appName: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  appKey: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  appType: {
    type: DataTypes.ENUM("API", "Socket"),
    allowNull: "API",
  },
  queryCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

// Define the association between User and App
User.hasMany(App); // A user can have multiple apps
App.belongsTo(User); // An app belongs to a user

// ... (remaining code)

// Define Log model
const Log = sequelize.define("Log", {
  action: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

// Associate User with App and Log
User.hasMany(App);
App.belongsTo(User);

User.hasMany(Log);
App.hasMany(Log);

// Synchronize the database schema
sequelize
  .sync()
  .then(() => {
    console.log("Database synchronized");
  })
  .catch((error) => {
    console.error("Error synchronizing database:", error);
  });

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ error: "Unauthorized - Missing token" });
  }

  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Forbidden - Invalid token" });
    }
    req.user = user;
    next();
  });
};
// ... (previous code)

// Registration route
app.post("/register", async (req, res) => {
  try {
    const { username, password, appName, appKey, appType } = req.body;

    // Get the user's IP address from the request headers
    const ipAddress =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;

    // Create the user
    const user = await User.create({ username, password, ipAddress });

    // Create the associated app
    const app = await user.createApp({ appName, appKey, appType, ipAddress });
    user.addApp(app);
    res.json({ message: "User registered successfully", user, app });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.get("/", (req, res) => {
  try {
    myEmitter.emit('customEvent', {});
    
    res.render("events");
  } catch (error) {
    console.error("Error rendering register view:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get('/events', (req, res)=>{
  res.render('events');
});
app.get('/show', (req, res)=>{
  res.render('show');
});

app.get('/register', (req, res)=>{
  res.render('register');
});
app.get('/query', (req, res)=>{
  res.render('query');
});
app.get('/token', (req, res)=>{
  res.render('token');
});
// ... (remaining code)

// App token request route
app.post("/get-app-token", authenticateToken, async (req, res) => {
  const { appName, appKey } = req.body;

  try {
    // Create an app in the database
    const newApp = await App.create({
      appName,
      appKey,
      UserId: req.user.id, // Associate the app with the user
    });

    // Generate a token for the app
    const appToken = jwt.sign({ appName, user: req.user.username }, secretKey);

    res.json({ appToken, app: newApp });
  } catch (error) {
    console.error("Error registering app:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Log action route
app.post("/log-action", authenticateToken, async (req, res) => {
  const { appName, action } = req.body;

  try {
    // Update the query count for the app
    await App.update(
      { queryCount: Sequelize.literal("queryCount + 1") },
      { where: { appName } }
    );

    // Log the action in the database
    await Log.create({
      action,
      AppAppName: appName, // Associate the log with the app
      UserId: req.user.id, // Associate the log with the user
    });

    res.json({ message: "Action logged successfully" });
  } catch (error) {
    console.error("Error logging action:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.get("/show-apps", async (req, res) => {
  try {
    // Fetch all apps associated with the authenticated user
    const userApps = await App.findAll();
    console.log("userApps", userApps);
    res.json({ userApps });
  } catch (error) {
    console.error("Error fetching user apps:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.post("/query-event", async (req, res) => {
  const { action, params, request } = req.body;
  const service = await require("./eventListener.js");
  // Emit the custom event with the query details
  console.log(action, params, request);
  service.myEmitter.emit(action, {
    query: { action, params, request },
  });
  // Send a response indicating that the query has been received

  await service.myEmitter.on("customResponse", (response) => {
    console.log("Response received:", response);
    res.status(200).json({ message: "Event query received." });
  });
});
app.get("/event-list", async (req, res) => {
  try {
    myEmitter.emit("customEvent", {});
    const events = await CachedEvent.findAll();
    res.status(200).json({ events });
  } catch (error) {
    console.error("Error retrieving event list:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
app.listen(port, () => {
  console.log(`API server listening at http://localhost:${port}`);
});
// Query event route
