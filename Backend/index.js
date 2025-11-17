import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import axios from "axios";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;

// 미들웨어
app.use(express.json());
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);

// 제미나이 호출용 함수
async function callGemini(promptText) {
  const apiKey = process.env.GEMINI_API_KEY;
const url =
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=" +
  apiKey;

  const body = {
    contents: [
      {
        parts: [{ text: promptText }],
      },
    ],
  };

  const res = await axios.post(url, body);
  console.log("Gemini response:", res.data);
  const candidates = res.data.candidates || [];
  const first = candidates[0];

  const text =
    first?.content?.parts?.map((p) => p.text).join("\n") ??
    "(응답을 가져오지 못했어요.)";

  return text;
}

// 프롬프트 생성 API
app.post("/api/prompt", async (req, res) => {
  try {
    const { originalText, goal, tone, format } = req.body;

    if (!originalText || typeof originalText !== "string") {
      return res
        .status(400)
        .json({ message: "originalText(사용자 질문)가 필요해요." });
    }

    // 여기서 "AI에게 줄 프롬프트"를 조합해 줌
    const systemPrompt = `
너는 사용자가 AI(ChatGPT, Gemini 등)에게 질문할 때,
질문을 더 명확하고 구체적으로 만들어 주는 "프롬프트 디자이너"야.

[입력으로 들어온 내용]
사용자가 아래에 적은 문장은 대충 쓰여 있거나, 문장이 엉성하거나, 
질문이 여러 개 섞여 있을 수도 있다. 그래도 "사용자가 진짜로 알고 싶어 하는 것"과
"AI가 답할 때 필요한 맥락"을 최대한 추론해서 정리해야 한다.

사용자의 원래 입력:
${originalText}

[너의 작업]
1. 사용자가 진짜로 원하는 목적/의도를 파악한다.
2. 필요한 경우, AI가 먼저 사용자에게 물어보면 좋을 보충 질문도 프롬프트 안에 포함한다.
   (예: "먼저 다음 정보를 알려 주세요: ~~~")
3. AI가 어떤 역할로 답하면 좋을지 역할(Role)을 정해준다.
   (예: "당신은 시니어 프론트엔드 개발자입니다." 등)
4. 답변의 형식/구조를 정해준다.
   - 예: 단계별, 목록, 표, 코드 위주, 예시 포함 등
   - 사용자가 goal/tone/format을 지정했다면 최대한 반영한다.

[참고 정보]
- 목표(goal): ${goal || "지정 안 함 (문맥에서 알아서 추론)"}
- 톤(tone): ${tone || "친절하고 명확하게"}
- 출력 형식(format): ${format || "질문 성격에 맞게 단계/리스트/요약 등 적절히 선택"}


[출력 형식 - 아주 중요]
- 오직 "AI에게 바로 줄 수 있는 프롬프트"만 한국어로 출력한다.
- "사용자의 질문은 ~~~입니다" 같은 메타 설명이나 해설은 쓰지 않는다.
- "다음은 프롬프트입니다:" 같은 문장도 쓰지 않는다.
- 코드 블록(\`\`\`)으로 감싸지 않는다.


위 조건을 지키면서, 사용자의 의도가 잘 드러나는 최적의 프롬프트 한 개를 작성해라.
`;

    const recommendedPrompt = await callGemini(systemPrompt);

    res.json({
      originalText,
      recommendedPrompt,
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({
      message: "Gemini 호출 중 오류가 발생했어요.",
    });
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 Prompt backend listening on port ${PORT}`);
});
