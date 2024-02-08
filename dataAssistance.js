require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const OpenAI = require("openai");
const morgan = require("morgan");

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("dev"));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/assistant", async (req, res, next) => {
  const { assistant, question } = req.body;

  if (!question) {
    return res.status(400).json({ error: "The question is required" });
  } else if (!assistant) {
    return res.status(400).json({ error: "The assistant is required" });
  }

  try {
    const createThread = await openai.beta.threads.create();
    await openai.beta.threads.messages.create(
      createThread.id,
      {
        role: "user",
        content: question,
      }
    );

    const myAssistant = await openai.beta.assistants.retrieve(assistant);

    let run = await openai.beta.threads.runs.create(createThread.id, {
      assistant_id: myAssistant.id,
    });

    while (run.status !== "completed") {
      console.log("🚀 Loading...");
      await new Promise((resolve) => setTimeout(resolve, 8000));
      run = await openai.beta.threads.runs.retrieve(createThread.id, run.id);
    }

    const messages = await openai.beta.threads.messages.list(createThread.id);

    const cleanedResponse = messages.data[0].content[0].text.value.replace(
      /\【\d+\†source\】/g,
      ""
    );
    res.json({
      response: cleanedResponse,
      status: messages.response.status,
    });
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Server error", message: err.message });
});

app.listen(port, () => {
  console.log(`Server up in http://localhost:${port}`);
});
