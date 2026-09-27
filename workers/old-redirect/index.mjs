// youmind-hub legacy redirector: 301 the old per-model domains to the unified
// hub sub-paths. Deployed with routes on the two legacy hostnames.
const REDIRECTS = {
  "seedance.beyondmotion.net": "https://youmind.beyondmotion.net/seedance-2-0/",
  "gptimage.beyondmotion.net": "https://youmind.beyondmotion.net/gpt-image-2/"
};

export default {
  async fetch(request) {
    const { hostname } = new URL(request.url);
    const target = REDIRECTS[hostname];
    if (target) {
      return Response.redirect(target, 301);
    }
    return new Response("Not found", { status: 404 });
  }
};
