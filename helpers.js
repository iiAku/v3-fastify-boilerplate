const p = require("phin");
const config = require("./modules/config.json");
const fs = require("fs");
const Aigle = require("aigle");
const { promisify } = require("util");
const sizeOf = promisify(require("image-size"));
sizeOf.setConcurrency(123456);
const pumpy = promisify(require("pump"));

const modules = fs.readdirSync("./modules");
const scrapers = {};
for (m of modules) {
  scrapers[m.split(".js")[0]] = require(`./modules/${m}`);
}

const log = (str) => console.log("[" + new Date().toISOString() + "] " + str);

const getPage = (url) =>
  p({
    url: config.endpoint,
    method: "POST",
    parse: "json",
    data: {
      link: url,
    },
  });

const getImageRessource = (pageBody, title, type) => {
  return new Promise(async (resolve, reject) => {
    try {
      const ressources = await scrapers[type].scraper(pageBody, title);
      Aigle.resolve(ressources.content)
        .mapLimit(config[type].concurrency, (ressource) => {
          return new Aigle((aResolve) => {
            fs.stat(ressource.path, async (err) => {
              if (err) {
                try {
                  const rs = await p({
                    url: ressource.url,
                    followRedirects: true,
                    stream: true,
                  });
                  if (rs.statusCode === 200) {
                    await pumpy(
                      rs.stream,
                      fs.createWriteStream(ressource.path)
                    );
                    ressource["downloaded"] = true;
                  }
                  aResolve(ressource);
                } catch (error) {
                  console.log(error);
                  console.log("err while downloading", ressource.url);
                }
              } else {
                ressource["downloaded"] = true;
                aResolve(ressource);
              }
            });
          });
        })
        .then((arr) => resolve(arr.filter((a) => a.downloaded === true)));
    } catch (error) {
      reject(error);
    }
  });
};

const getMaxdimension = (ressources) => {
  return new Promise((resolve, reject) => {
    let maxWidth = 0;
    let maxHeight = 0;
    let sub = ressources;
    if (ressources.length > 20) {
      sub = ressources.slice(0, 5).concat(ressources.slice(-5));
    }

    return Aigle.resolve(sub)
      .each((image) => {
        return new Aigle(async (aResolve) => {
          try {
            const dimensions = await sizeOf(image.path);
            if (dimensions.width > maxWidth) {
              maxWidth = dimensions.width;
            }
            if (dimensions.height > maxHeight) {
              maxHeight = dimensions.height;
            }
            aResolve();
          } catch (err) {
            console.error(err);
          }
        });
      })
      .then(() => resolve({ width: maxWidth, height: maxHeight }));
  });
};

const send = (res, statusCode, data) => {
  res.type("application/json").code(statusCode);
  return data;
};

module.exports = {
  getPage,
  getImageRessource,
  getMaxdimension,
  log,
  send,
};
