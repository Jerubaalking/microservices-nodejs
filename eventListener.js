const EventEmitter = require("events");
const { Sequelize, DataTypes } = require("sequelize");

class MyEmitter extends EventEmitter {}

const myEmitter = new MyEmitter();

const mainDatabase = new Sequelize({
  dialect: "sqlite",
  storage: "mainDatabase.sqlite",
});

const cacheDatabase = new Sequelize({
  dialect: "sqlite",
  storage: "cacheDatabase.sqlite",
});

const Event = mainDatabase.define("Event", {
  data: {
    type: DataTypes.STRING,
  },
});

const CachedEvent = cacheDatabase.define("CachedEvent", {
  eventId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
  },
  data: {
    type: DataTypes.STRING,
  },
});

mainDatabase.sync();
cacheDatabase.sync();

myEmitter.once("customEvent", async (parameters) => {
  //   const { eventId, query } = parameters;

  const resultCount = await Event.count();
  const cacheCount = await CachedEvent.count();
  if (resultCount > cacheCount) {
    try {
      const result = JSON.parse(JSON.stringify(await Event.findAll()));
      for (const res in result) {
        let ans = JSON.parse(result[res]);
        let ans2 = await CachedEvent.findOne({
          where: { eventId: ans.eventId },
        });
        if (!ans2) {
          await CachedEvent.create(result[res]);
        }
      }

      const databaseResponse = {
        success: true,
        data: result ? result : `No data found for event`,
        fromCache: false,
      };

      myEmitter.emit("customResponse", databaseResponse);
      console.log(`Response from main database2: ${JSON.stringify(result)}`);
      myEmitter.off("customEvent", myEmitter.listenerCount("customEvent"));
    } catch (error) {
      console.error(`Database error: ${error.message}`);
    }
  } else {
    const cachedResult = await CachedEvent.findAll();

    if (cachedResult) {
      const cacheResponse = {
        success: true,
        data: cachedResult,
        fromCache: true,
      };

      myEmitter.emit("customResponse", cacheResponse);
      console.log(`Response from cache1: ${JSON.stringify(cacheResponse)}`);
    }
  }
});

myEmitter.on("createEvent", async (parameters) => {
  const { eventId, query } = parameters;
  console.log("query", query);
  try {
    const createdData = await Event.create({
      data: JSON.stringify(query),
    });

    const response = {
      success: true,
      data: createdData,
    };

    myEmitter.emit("customResponse", response);
    console.log(`New data created: ${JSON.stringify(response)}`);
  } catch (error) {
    myEmitter.emit("customResponse", error.message);
    console.error(`Error creating data: ${error.message}`);
  }
});
module.exports = { myEmitter, CachedEvent, Event };
