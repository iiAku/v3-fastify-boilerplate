const cluster = require("cluster");
const os = require("os");
const numCPUs = os.cpus().length;
const Keyv = require("keyv");
const fastify = require("fastify")({ logger: true });
const config = require("./modules/config.json");
const {
  getPage,
  getImageRessource,
  getMaxdimension,
  log,
  send,
} = require("./helpers");

const ONE_SEC = 1000;
const keyv = new Keyv("redis://localhost:7001", {
  serialize: JSON.stringify,
  deserialize: JSON.parse,
});

fastify.post("/", async (req, res) => {
  const body = req.body;
  const { url, title, type } = body;
  if (!url || !title || !type) {
    return send(res, 400, { error: "BAD_REQUEST" });
  }
  log(`[hit-${type}] 1/5 - ${url.substring(0, 100)}`);
  try {
    let imageRessources = await keyv.get(url);
    const imageListCached = imageRessources ? true : false;
    if (!imageRessources) {
      const response = await getPage(url);
      log(`[get-page-${type}] 2/5 - ${url.substring(0, 100)}`);
      const pageBody = response.body.body;
      imageRessources = await getImageRessource(pageBody, title, type);
      log(`[get-images-${type}] 3/5 - ${url.substring(0, 100)}`);
      await keyv.set(url, imageRessources, config[type].TTL * ONE_SEC);
    }
    let response = await keyv.get(url + "full");
    const fullCached = response ? true : false;
    if (!response) {
      const { width, height } = await getMaxdimension(imageRessources);
      log(`[get-dimensions-${type}] 4/5 - ${url.substring(0, 100)}`);
      response = {
        title: title,
        path: config[type].outputDir,
        extension: config[type].outputExtension,
        count: imageRessources.length,
        dimensions: { width, height },
      };
      await keyv.set(url + "full", response, config[type].TTL * ONE_SEC);
    }
    log(
      `[serving-${type}] 5/5 ${url.substring(0, 100)} [cached image] ${
        imageListCached ? "✔" : "×"
      } [cached-full-${type}]: ${fullCached ? "✔" : "×"}`
    );
    return send(res, 200, response);
  } catch (error) {
    console.log(error);
    return send(res, 500, { error: "SOMETHING_WENT_WRONG" });
  }
});

// Run the server!
const start = async () => {
  try {
    await fastify.listen(config.port);
    fastify.log.info(`server listening on ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on("exit", (worker) => log(`worker ${worker.process.pid} died`));
} else {
  start();
}
