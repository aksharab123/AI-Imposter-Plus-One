const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function send(res, status, obj) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(obj));
}

function body(req) {
  return new Promise((resolve, reject) => {
    let s = "";
    req.on("data", c => {
      s += c;
      if (s.length > 1e6) {
        reject(Error("Request too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(s || "{}"));
      } catch {
        reject(Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

async function gemini(system, prompt, jsonMode = false) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw Error("GEMINI_API_KEY is not configured");
  }

  const generationConfig = {
    temperature: 0.8,
    maxOutputTokens: 300
  };

  if (jsonMode) {
    generationConfig.responseMimeType = "application/json";
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: system }]
        },
        contents: [{
          role: "user",
          parts: [{ text: prompt }]
        }],
        generationConfig
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw Error(
      data.error?.message || `Gemini API error ${response.status}`
    );
  }

  const text = (data.candidates?.[0]?.content?.parts || [])
    .map(part => part.text || "")
    .join("")
    .trim();

  if (!text) {
    throw Error("Gemini returned an empty response");
  }

  return text;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (req.method === "GET" && url.pathname === "/api/status") {
    return send(res, 200, {
      configured: Boolean(process.env.GEMINI_API_KEY),
      provider: "Google Gemini",
      model: MODEL
    });
  }

  if (req.method === "POST" && url.pathname === "/api/clue") {
    try {
      const b = await body(req);

      const clue = await gemini(
        "You are a player in a social deduction game. Generate one natural, " +
        "subtle clue of at most 12 words about your secret word. " +
        "Never reveal the secret word. Avoid repeating previous clues. " +
        "Return only the clue.",
        `Secret word: ${String(b.word || "").slice(0, 100)}
Difficulty: ${String(b.difficulty || "medium")}
Previous clues:
${(b.clues || []).map(x => String(x).slice(0, 200)).join("\n")}`
      );

      return send(res, 200, {
        clue: clue.replace(/^["']|["']$/g, "").slice(0, 120),
        source: "Gemini LLM"
      });
    } catch (e) {
      console.error("Gemini clue error:", e.message);
      return send(res, 502, { error: e.message });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/vote") {
    try {
      const b = await body(req);
      const players = (b.players || []).map(x => String(x).slice(0, 80));
      const clues = (b.clues || []).map(x => String(x).slice(0, 250));

      const answer = await gemini(
        'You are an analytical player in a social deduction game. ' +
        'Assess which human players may have a different secret word. ' +
        'Use the clues and context, but acknowledge uncertainty. ' +
        'Return JSON with this exact shape: ' +
        '{"scores":{"player name":50},"reason":"one short sentence"}. ' +
        'Give every listed player a suspicion score from 0 to 100. ' +
        'Do not include players who are not in the supplied list.',
        `AI player's secret word: ${String(b.word || "").slice(0, 100)}
Human players: ${JSON.stringify(players)}
Clues:
${clues.join("\n")}`,
        true
      );

      const result = JSON.parse(answer);
      const scores = {};

      for (const name of players) {
        const value = Number(result.scores?.[name]);
        if (Number.isFinite(value)) {
          scores[name] = Math.max(0, Math.min(100, Math.round(value)));
        } else {
          scores[name] = 50;
        }
      }

      return send(res, 200, {
        scores,
        reason: String(result.reason || "Gemini compared the clues."),
        source: "Gemini LLM"
      });
    } catch (e) {
      console.error("Gemini vote error:", e.message);
      return send(res, 502, { error: e.message });
    }
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    return res.end("Method not allowed");
  }

  const reqPath = decodeURIComponent(
    url.pathname === "/" ? "/index.html" : url.pathname
  );
  const file = path.resolve(ROOT, "." + reqPath);

  if (!file.startsWith(ROOT + path.sep)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Not found: " + path.basename(file));
    }

    res.writeHead(200, {
      "Content-Type": types[path.extname(file)] ||
        "application/octet-stream",
      "Cache-Control": "no-cache"
    });

    res.end(req.method === "HEAD" ? "" : data);
  });
});

server.listen(PORT, () => {
  console.log(`AI Imposter running at http://localhost:${PORT}`);
  console.log(`Provider: Google Gemini | Model: ${MODEL}`);
  console.log(
    process.env.GEMINI_API_KEY
      ? "API key detected. Gemini requests are enabled."
      : "WARNING: No GEMINI_API_KEY configured."
  );
});
