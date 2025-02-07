import ollama from "ollama";
import { feed } from "./feed";
import { Readable } from "stream";

const CORS_HEADERS = {
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS, POST",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  },
};

const server = Bun.serve({
  port: 8080,
  idleTimeout: 120,
  async fetch(req) {
    console.log("req:", req);

    if (req.method === "OPTIONS") {
      const res = new Response("Departed", CORS_HEADERS);
      return res;
    }

    const { body } = req;
    if (!body) return new Response("error", CORS_HEADERS);

    const data = await Bun.readableStreamToJSON(body);
    console.log("data:", data.body);

    // create stream
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const feedData = feed(data.body);

    const response = await ollama.chat({
      model: "deepseek-r1:7b",
      messages: [{ role: "user", content: feedData }],
      keep_alive: "5m",
      stream: true,
    });

    (async () => {
      try {
        let logging = "";
        for await (const chunk of response) {
          const message = chunk.message.content;
          logging += message;
          console.log(logging);
          await writer.write(
            `data: ${JSON.stringify({ content: message })}\n\n`
          );
        }
        await writer.write("data: [DONE]\n\n");
        await writer.close();
      } catch (error) {
        console.error("stream error:", error);
        await writer.abort(error);
      }
    })();

    return new Response(stream.readable, CORS_HEADERS);
    // console.log(response.message.content);

    // const content = response.message.content;
    // const cleanedResponse = content
    //   .replace(/<think>[\s\S]*?<\/think>/g, "")
    //   .trim();

    // const tsxMatch = cleanedResponse.match(/```tsx\n([\s\S]*?)```/);
    // const componentCode = tsxMatch ? tsxMatch[1] : "";

    // console.log("componentCode:", componentCode);

    // return new Response(JSON.stringify({ componentCode }), CORS_HEADERS);

    // return new Response("Hey", CORS_HEADERS);
  },
});

console.log(`Listening on http://localhost:${server.port} ...`);
