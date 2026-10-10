
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const body = await req.json();
    const query = body?.query;

    if (typeof query !== "string" || !query.trim()) {
      return Response.json(
        { error: "A search query is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const apiKey = Deno.env.get("SERPAPI_KEY");

    if (!apiKey) {
      console.error("SERPAPI_KEY is missing");
      return Response.json(
        { error: "Search API is not configured" },
        { status: 500, headers: corsHeaders }
      );
    }

    const params = new URLSearchParams({
      engine: "google",
      q: query.trim(),
      api_key: apiKey,
      gl: "in",
      hl: "en",
    });

    const response = await fetch(
      `https://serpapi.com/search.json?${params.toString()}`
    );

    if (!response.ok) {
      console.error("SerpAPI HTTP status:", response.status);
      return Response.json(
        { error: "Web search failed" },
        { status: 502, headers: corsHeaders }
      );
    }

    const data = await response.json();

    const results = (data.organic_results ?? [])
      .slice(0, 5)
      .map((item: {
        title?: string;
        link?: string;
        snippet?: string;
      }) => ({
        title: item.title ?? "",
        link: item.link ?? "",
        snippet: item.snippet ?? "",
      }));

    return Response.json(
      {
        success: true,
        query: query.trim(),
        results,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("SerpAPI function error:", error);

    return Response.json(
      { error: "Search failed. Check the function logs." },
      { status: 500, headers: corsHeaders }
    );
  }
});