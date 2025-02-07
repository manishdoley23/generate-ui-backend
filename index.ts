import ollama from "ollama";
import { feed } from "./feed";
import { matchToComponent } from "./utils/match-to-component";

const CORS_HEADERS = {
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS, POST",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  },
};

const SYSTEM_PROMPT = `
You are a CRM system intent parser. 
Available services:
- Template creation and management
- Campaign tracking
- Contact management

Extract user intent in JSON format with these fields:
- action: The primary action (create/read/update/delete)
- entity: The target entity (template/campaign/contact)
- constraints: Any specific requirements or limitations

PS: If nothing of context is provided return empty strings for the values
`;

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
    // const stream = new TransformStream();
    // const writer = stream.writable.getWriter();

    // const feedData = feed(data.body);

    const response = await ollama.chat({
      model: "deepseek-r1:7b",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: data.body },
      ],
      keep_alive: "5m",
      // stream: true,
    });

    // (async () => {
    //   try {
    //     let logging = "";
    //     for await (const chunk of response) {
    //       const message = chunk.message.content;
    //       logging += message;
    //       console.log(logging);
    //       await writer.write(
    //         `data: ${JSON.stringify({ content: message })}\n\n`
    //       );
    //     }
    //     await writer.write("data: [DONE]\n\n");
    //     await writer.close();
    //   } catch (error) {
    //     console.error("stream error:", error);
    //     await writer.abort(error);
    //   }
    // })();

    console.log("response:", response.message.content);
    const content = response.message.content;
    const cleanedResponse = content
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .trim();
    const json = cleanedResponse.match(/```json\n([\s\S]*?)```/);
    const componentCode = json ? json[1] : "";
    console.log("componentCode:", componentCode);
    const intent = JSON.parse(componentCode);
    console.log("intent:", intent);

    const component = matchToComponent(intent);

    console.log("compoenent:", component);

    return new Response(JSON.stringify(component), CORS_HEADERS);
    // console.log(response.message.content);

    // console.log("componentCode:", componentCode);

    // return new Response(JSON.stringify({ componentCode }), CORS_HEADERS);

    return new Response("Hey", CORS_HEADERS);
  },
});

console.log(`Listening on http://localhost:${server.port} ...`);
