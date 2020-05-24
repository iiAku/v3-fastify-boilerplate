const path = require("path");
const config = require("./config.json");
const type = path.basename(__filename).split(".")[0];

const scraper = async (pageBody, title) => {
  if (!(type in config)) {
    throw new Error("No config for type provided");
  }
  // Your data fetching logic goes there...
  }

  return {
    title: title,
    content: Array.from({ length: pageCount }, (v, k) => k).map((link, i) => ({
      path: path,
      url: url,
      downloaded: false,
    })),
  };
};

module.exports = { scraper };