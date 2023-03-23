import { OpenAPIRouter } from "@cloudflare/itty-router-openapi";
import { validate, isValid } from "./validators";

const router = OpenAPIRouter({
  schema: {
    info: {
      title: "Simple Email Validation API",
      version: "1.0",
    },
  },
});

router.get("/isValid", isValid);
router.post("/isValid", validate);
// router.post("/validate/", validate);

// Redirect root request to the /docs page
router.original.get("/", (request) =>
  Response.redirect(`${request.url}docs`, 302)
);

// 404 for everything else
router.all("*", () => new Response("Not Founds.", { status: 404 }));

export default {
  fetch: router.handle,
};
