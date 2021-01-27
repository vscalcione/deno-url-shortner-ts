import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import {
  viewEngine,
  engineFactory,
  adapterFactory,
} from "https://deno.land/x/view_engine/mod.ts";
import { multiParser } from "https://raw.githubusercontent.com/deligenius/multiparser/master/mod.ts";
import { MongoClient } from "https://deno.land/x/mongo@v0.7.0/mod.ts";
import ShortUniqueId from "https://cdn.jsdelivr.net/npm/short-unique-id@latest/short_uuid/mod.ts";

const app = new Application();
const router = new Router();

const ejsEngine = engineFactory.getEjsEngine();
const oakAdapter = adapterFactory.getOakAdapter();
app.use(viewEngine(oakAdapter, ejsEngine));

const client = new MongoClient();
client.connectWithUri("mongodb://localhost:27017");
const db = client.database("shortner");
const urlCollection = db.collection("url");
const UUID = new ShortUniqueId();

router
  .get("/", async (ctx) => {
    const allUrl = await urlCollection.find({});
    ctx.render("index.ejs", { data: allUrl });
  })
  .post("/post", async (ctx) => {
    const formData: any = await multiParser(ctx.request.serverRequest);
    const urlObject = {
      fullUrl: formData.url,
      shortUrl: UUID(),
      click: 0,
    };
    await urlCollection.insertOne(urlObject);
    ctx.response.redirect("/");
  })
  .get("/:shortId", async (ctx) => {
    const shortUrlId = ctx.params.shortId;
    const isUrl = await urlCollection.findOne({
      shortUrl: shortUrlId,
    });
    if (isUrl) {
      ctx.response.status = 301;
      await urlCollection.updateOne(
        {
          _id: isUrl._id,
        },
        {
          $set: {
            $click: isUrl.click + 1,
          },
        }
      );
      ctx.response.redirect(`${isUrl.fullURL}`);
    } else {
      ctx.response.status = 404;
      ctx.response.body = "Error 404! Page not found";
    }
  });

app.use(router.routes());
app.use(router.allowedMethod());

console.log("App is listening to port 8080");
await app.listen({ port: 8080 });
