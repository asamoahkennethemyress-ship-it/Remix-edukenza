import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, doc, getDoc, setDoc, addDoc, updateDoc, runTransaction } from "firebase/firestore";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser for larger payloads (base64 image/document uploads)
app.use(express.json({
  limit: "50mb",
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Enable CORS for PWA and external clients
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

// Health Check API
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "EDUkenZA", timestamp: new Date().toISOString() });
});

const MASTER_EDUKENZA_SYSTEM_PROMPT = `You are EDUkenZA AI, an authoritative, deeply knowledgeable educational intelligence system combining the capabilities of a Master Educator, Specialist Tutor, Curriculum Developer, and School Management Analyst across South African CAPS, IEB, Cambridge, and international school curricula.

==================================================
1. PROFESSIONAL AI PERSONALITY
==================================================
Your responses must be:
- Clear, intelligent, accurate, structured, and pedagogical.
- Concise when appropriate, detailed when necessary.
- Natural, confident, respectful, and easy to understand.
- Adapted to the user's prompt length:
  * Simple question -> direct, clear, focused answer.
  * Complex question -> structured, in-depth explanation.
  * "Explain briefly" -> brief, high-level summary.
  * "Explain in detail" -> comprehensive, step-by-step breakdown.
  * Do NOT generate massive walls of text for simple queries.

STRICTLY BANNED PRACTICES:
- No unnecessary headings or decorative clutter.
- No repetitive introductions ("Sure! I'd be happy to...", "Certainly! As an educational AI...", "Hello! Here is...", "Great question!").
- No excessive emojis (keep tone clean, authoritative, and academic).
- No robotic phrasing or generic filler.
- No repetitive conclusions ("In conclusion...", "I hope this helps! Feel free to ask if you have more questions!").
- No unnecessary disclaimers ("Please note that I am an AI...").
- No meaningless corporate or promotional jargon.
Begin directly with the substance of the answer.

==================================================
2. PROFESSIONAL EDUCATIONAL RESPONSE STRUCTURE
==================================================
When answering conceptual academic questions, organize logically where it adds clarity:
### Explanation
Clear, pedagogically sound conceptual breakdown.

### Example
Real-world application or concrete mathematical/scientific problem.

### Key Point
Crucial takeaway or memory rule.

NOTE: Do NOT force these headings into every response. Use them only when they improve conceptual clarity.

==================================================
3. PROFESSIONAL MATHEMATICS & LATEX
==================================================
Always format mathematics using proper KaTeX-compatible LaTeX:
- Inline formulas: Use \\( ... \\) or $ ... $ (e.g., \\(x^2 + 5x + 6 = 0\\) or $x = 5$).
- Display / Block formulas: Use \\[ ... \\] or $$ ... $$ with clean line breaks:
  \\[
  x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
  \\]
- For calculations and problem solving:
  ### Given
  List known values, variables, and units clearly.

  ### Solution
  Show every step algebraically and arithmetically with line-by-line progression.

  ### Answer
  Highlight the final result clearly with boxed notation:
  \\[
  \\boxed{x = 5}
  \\]
- Never output broken or unparsed raw LaTeX markup.

==================================================
4. PROFESSIONAL CHEMISTRY
==================================================
- Write chemical formulas with correct subscripts and superscripts:
  H₂O, CO₂, H₂SO₄, Ca(OH)₂, NH₄⁺, SO₄²⁻
- Format chemical reaction equations cleanly:
  \\[
  2\\text{H}_2 + \\text{O}_2 \\rightarrow 2\\text{H}_2\\text{O}
  \\]
  or with state symbols:
  \\[
  \\text{CaCO}_3\\text{(s)} + 2\\text{HCl}\\text{(aq)} \\rightarrow \\text{CaCl}_2\\text{(aq)} + \\text{H}_2\\text{O}\\text{(l)} + \\text{CO}_2\\text{(g)}
  \\]
- Maintain accurate chemical stoichiometry, reaction arrows (\\rightarrow), coefficients, and oxidation states. Never corrupt chemical notation.

==================================================
5. PROFESSIONAL SCIENCE (PHYSICS & BIOLOGY)
==================================================
- Use precise scientific terminology, correct physical laws, and standard SI units (m/s, m/s², N, J, W, kg, mol, etc.).
- Never invent scientific facts, empirical data, or biological functions.
- Provide logical, step-by-step physical derivations and accurate biological physiological mechanisms.

==================================================
6. STRICT DATA INTEGRITY & REAL DATA ONLY (ZERO FAKE DATA)
==================================================
THIS IS AN ABSOLUTE PRODUCTION DIRECTIVE. The AI must NEVER fabricate:
- School enrollment figures or student counts
- Teacher, parent, or staff numbers
- Student names, marks, grades, or transcripts
- Attendance percentages or attendance logs
- School fees, payments, invoices, balances, or financial amounts
- Class counts, names, or capacity statistics
- School KPIs, pass rates, or institutional metrics

MANDATORY RULES:
1. NEVER guess or invent numbers. NEVER use demo placeholder numbers (e.g., 1240, 450, 32, 58, 380, 12, 89.4%, R 572,300).
2. When authoritative database facts are provided in the context (marked "AUTHORITATIVE DATABASE FACT"), you MUST state those exact figures with total precision.
3. If an authoritative count is 0, report 0 with complete honesty (e.g., "You currently have 0 students enrolled in your school." or "You currently have 0 teachers registered in your school.").
4. School Isolation is non-negotiable: School A must NEVER see School B data. Never discuss or reveal another school's data.
5. If school records are requested but no verified data exists in the context, state: "I couldn't find matching records in your school database."
6. Do NOT fabricate demo scenarios or make up plausible numbers. Real data or nothing.

==================================================
7. ROLE-SPECIFIC PROFESSIONAL PERSONAS
==================================================
- STUDENT: "Your EDUkenZA AI Tutor"
  Prioritize student learning. Do not simply do the homework for them. Explain the concept, demonstrate the method, check for understanding, and provide a practice problem.
- TEACHER: "Your EDUkenZA Teaching Assistant"
  Provide classroom-ready resources: CAPS/IEB curriculum-aligned lesson plans, learning objectives with Bloom's Taxonomy, teaching activities, differentiated instruction, formative assessments, homework tasks, and complete marking memoranda.
- PARENT: "Your EDUkenZA Education Assistant"
  Use warm, accessible, jargon-free language. Help parents understand academic progress, study guidance, curriculum expectations, and supportive home learning strategies. Never disclose unauthorized student data.
- SCHOOL ADMIN: "Your EDUkenZA Administrative Assistant"
  Deliver executive summaries, academic audit frameworks, governance circulars, compliance checklists, and strategic planning outlines. Never invent school statistics.
- PLATFORM OWNER: "Your EDUkenZA Platform Assistant"
  Support institutional rollouts, quality assurance, multi-school governance, EdTech compliance, and platform performance.`;

// Helper to initialize GenAI client lazy/on demand
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    throw new Error("GEMINI_API_KEY environment variable is missing or placeholder. Please configure a valid Gemini API key in AI Studio Settings.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}

// Resilient model cascade: High-performance gemini-3.6-flash, ultra-fast gemini-3.1-flash-lite, advanced gemini-3.8-flash, resilient gemini-flash-latest
const PRIMARY_TEXT_MODELS = ["gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];

async function generateGeminiContentWithFallback(ai: any, requestPayload: {
  contents: any;
  systemInstruction?: string;
  temperature?: number;
}): Promise<{ text: string; modelUsed: string }> {
  let lastError: any = null;

  for (const model of PRIMARY_TEXT_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: requestPayload.contents,
        config: {
          systemInstruction: requestPayload.systemInstruction,
          temperature: typeof requestPayload.temperature === "number" ? requestPayload.temperature : 0.7,
        }
      });
      if (response && response.text) {
        return { text: response.text, modelUsed: model };
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[EDUkenZA AI] Model ${model} encountered notice (${err?.message?.slice(0, 100)}), trying next in cascade...`);
      // Brief pause if 503 / 429 / high demand spike
      if (
        err?.message?.includes("503") || 
        err?.message?.includes("UNAVAILABLE") ||
        err?.message?.includes("429") ||
        err?.message?.includes("RESOURCE_EXHAUSTED")
      ) {
        await new Promise(res => setTimeout(res, 300));
      }
    }
  }

  throw lastError || new Error("All Gemini models in cascade were unavailable. Please retry in a moment.");
}

// -------------------------------------------------------------
// REAL-TIME GEMINI API STATUS & HEALTH CHECK ENDPOINT
// -------------------------------------------------------------
app.get("/api/ai/status", async (req, res) => {
  const startTime = Date.now();
  try {
    const ai = getGenAI();
    const result = await generateGeminiContentWithFallback(ai, {
      contents: "Respond with the single word: operational",
    });
    const latencyMs = Date.now() - startTime;
    res.json({
      status: "online",
      working: true,
      model: result.modelUsed,
      latencyMs,
      sampleResponse: result.text.trim(),
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.warn("[GEMINI STATUS CHECK] Notice:", err?.message);
    const parsed = parseGenAIError(err);
    res.status(parsed.status).json({
      status: "error",
      working: false,
      error: parsed.message,
      timestamp: new Date().toISOString()
    });
  }
});

async function generateGeminiStreamWithFallback(ai: any, requestPayload: {
  contents: any;
  systemInstruction?: string;
  temperature?: number;
}): Promise<{ stream: any; modelUsed: string }> {
  let lastError: any = null;

  for (const model of PRIMARY_TEXT_MODELS) {
    try {
      const stream = await ai.models.generateContentStream({
        model,
        contents: requestPayload.contents,
        config: {
          systemInstruction: requestPayload.systemInstruction,
          temperature: typeof requestPayload.temperature === "number" ? requestPayload.temperature : 0.7,
        }
      });
      return { stream, modelUsed: model };
    } catch (err: any) {
      lastError = err;
      console.warn(`[EDUkenZA AI] Stream model ${model} encountered notice (${err?.message?.slice(0, 100)}), trying next in cascade...`);
      if (
        err?.message?.includes("503") || 
        err?.message?.includes("UNAVAILABLE") ||
        err?.message?.includes("429") ||
        err?.message?.includes("RESOURCE_EXHAUSTED")
      ) {
        await new Promise(res => setTimeout(res, 400));
      }
    }
  }

  throw lastError || new Error("All Gemini streaming models in cascade were unavailable. Please retry in a moment.");
}

/**
 * Normalizes multi-turn conversation history for Gemini API:
 * 1. Accepts string, { content }, { text }, or { parts: [{ text }] } formats.
 * 2. Skips empty placeholder turns.
 * 3. Ensures the sequence starts with a 'user' turn (drops leading assistant greeting).
 * 4. Merges consecutive same-role messages into a single turn.
 * 5. Appends current prompt and optional images.
 */
function normalizeGeminiContents(history: any[], currentPrompt: string, images?: any[]) {
  const contents: Array<{ role: 'user' | 'model'; parts: any[] }> = [];

  const extractText = (turn: any): string => {
    if (!turn) return '';
    if (typeof turn === 'string') return turn;
    if (typeof turn.content === 'string') return turn.content;
    if (typeof turn.text === 'string') return turn.text;
    if (Array.isArray(turn.parts)) {
      return turn.parts.map((p: any) => (typeof p === 'string' ? p : p?.text || '')).join('\n').trim();
    }
    return '';
  };

  if (Array.isArray(history)) {
    for (const turn of history) {
      const text = extractText(turn).trim();
      if (!text) continue; // Skip empty turns

      const role: 'user' | 'model' = (turn.role === 'user') ? 'user' : 'model';

      // Gemini requires first message to be from 'user'
      if (contents.length === 0 && role === 'model') {
        continue;
      }

      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts.push({ text });
      } else {
        contents.push({
          role,
          parts: [{ text }]
        });
      }
    }
  }

  // Build current message parts
  const currentParts: any[] = [];
  if (Array.isArray(images)) {
    for (const img of images) {
      if (img.data && img.mimeType) {
        currentParts.push({
          inlineData: {
            data: img.data.replace(/^data:[^;]+;base64,/, ''),
            mimeType: img.mimeType
          }
        });
      }
    }
  }
  if (currentPrompt && currentPrompt.trim()) {
    currentParts.push({ text: currentPrompt.trim() });
  }

  if (currentParts.length > 0) {
    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts.push(...currentParts);
    } else {
      contents.push({
        role: 'user',
        parts: currentParts
      });
    }
  }

  return contents;
}

function parseGenAIError(error: any): { isApiKeyError: boolean; status: number; message: string } {
  const rawMsg = typeof error === 'string' ? error : (error?.message || JSON.stringify(error || {}));
  
  if (
    rawMsg.includes("RESOURCE_EXHAUSTED") ||
    rawMsg.includes("429") ||
    rawMsg.includes("Quota exceeded") ||
    rawMsg.includes("rate-limits") ||
    rawMsg.includes("rate limit")
  ) {
    return {
      isApiKeyError: false,
      status: 429,
      message: "Gemini API rate limit or model quota exceeded. Please retry in a few moments, or try a different task."
    };
  }

  if (
    rawMsg.includes("API_KEY_INVALID") ||
    rawMsg.includes("API key not valid") ||
    rawMsg.includes("GEMINI_API_KEY") ||
    rawMsg.includes("INVALID_ARGUMENT") ||
    rawMsg.includes("API_KEY")
  ) {
    return {
      isApiKeyError: true,
      status: 400,
      message: "The Gemini API key is missing or invalid. Please configure a valid GEMINI_API_KEY in the AI Studio Settings menu."
    };
  }

  console.error("[EDUkenZA AI Secure Diagnostic Log]:", rawMsg);
  return {
    isApiKeyError: false,
    status: 500,
    message: "EDUkenZA AI is temporarily unavailable. Please try again."
  };
}

// -------------------------------------------------------------
// 1. REAL-TIME AI CHAT ENDPOINT (STREAMING SSE OR DIRECT JSON)
// -------------------------------------------------------------
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { 
      prompt, 
      history = [], 
      systemInstruction = "", 
      role: bodyRole,
      userRole,
      schoolName,
      targetTask = "general",
      images = [],
      temperature = 0.7,
      responseLength = "medium",
      responseStyle = "default",
      language = "English",
      stream = true,
      authoritativeFacts = ""
    } = req.body;

    const role = (bodyRole || userRole || "student").toLowerCase();

    if (!prompt && (!images || images.length === 0)) {
      return res.status(400).json({ error: "Prompt or image input is required." });
    }

    let ai;
    try {
      ai = getGenAI();
    } catch (keyErr: any) {
      const parsed = parseGenAIError(keyErr);
      return res.status(parsed.status).json({ error: parsed.message });
    }

    let roleContext = `${MASTER_EDUKENZA_SYSTEM_PROMPT}\n\nCURRENT SESSION ROLE: ${role.toUpperCase()}.\nTASK DOMAIN: ${targetTask.toUpperCase()}.\nTARGET RESPONSE LANGUAGE: ${language.toUpperCase()}.`;
    
    if (role === "student") {
      roleContext += `\n• STUDENT FOCUS: Teach step-by-step. Break down math (Given, Formula, Working, Solution, Final Answer) and science (Definition, Explanation, Process, Example, Summary). Encourage independent thinking.`;
    } else if (role === "teacher") {
      roleContext += `\n• TEACHER FOCUS: Provide curriculum alignment, learning objectives, lesson structures, rubrics, marking schemes, and pedagogical strategies.`;
    } else if (role === "parent") {
      roleContext += `\n• PARENT FOCUS: Provide clear, encouraging, jargon-free explanations to help parents understand progress, grade reports, and home study recommendations.`;
    } else if (role === "school_admin" || role === "platform_owner") {
      roleContext += `\n• ADMIN FOCUS: Provide high-level analytical, statistical, policy, and administrative summaries for school leadership.`;
    }

    if (responseLength === "short") {
      roleContext += `\n• RESPONSE LENGTH MANDATE: Keep response short, concise, and direct (under 200 words).`;
    } else if (responseLength === "long") {
      roleContext += `\n• RESPONSE LENGTH MANDATE: Provide an in-depth, thorough response with detailed examples and background context.`;
    } else if (responseLength === "very_detailed") {
      roleContext += `\n• RESPONSE LENGTH MANDATE: Provide an exhaustive, comprehensive, textbook-quality breakdown covering all sub-topics, proof steps, worked examples, and practice exercises.`;
    }

    if (responseStyle === "teacher") {
      roleContext += `\n• TONE / STYLE: Adopt an encouraging, clear pedagogical teacher tone with structured sections and clear takeaways.`;
    } else if (responseStyle === "professional") {
      roleContext += `\n• TONE / STYLE: Adopt a formal, precise professional tone.`;
    } else if (responseStyle === "parent") {
      roleContext += `\n• TONE / STYLE: Adopt a warm, reassuring, jargon-free tone suitable for parents.`;
    }

    let fullSystemInstruction = systemInstruction 
      ? `${roleContext}\n\nAdditional Instruction: ${systemInstruction}`
      : roleContext;

    if (schoolName) {
      fullSystemInstruction += `\n• INSTITUTION CONTEXT: User belongs to ${schoolName}.`;
    }

    if (authoritativeFacts) {
      fullSystemInstruction += `\n• AUTHORITATIVE DATABASE FACT: ${authoritativeFacts}\nCRITICAL MANDATE: You MUST report this exact figure. NEVER guess or invent numbers.`;
    }

    // Prepare contents array with history, current prompt, and images using robust normalization
    const contents = normalizeGeminiContents(history, prompt, images);

    if (contents.length === 0) {
      return res.status(400).json({ error: "Prompt or valid content is required." });
    }

    // Check if non-streaming JSON is explicitly requested
    const acceptHeader = req.headers.accept || "";
    const isJsonRequested = stream === false || acceptHeader === "application/json";

    if (isJsonRequested) {
      const result = await generateGeminiContentWithFallback(ai, {
        contents,
        systemInstruction: fullSystemInstruction,
        temperature: typeof temperature === 'number' ? temperature : 0.7,
      });
      return res.json({ text: result.text, modelUsed: result.modelUsed });
    }

    // Default: Enable streaming SSE response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const { stream: responseStream } = await generateGeminiStreamWithFallback(ai, {
      contents,
      systemInstruction: fullSystemInstruction,
      temperature: typeof temperature === 'number' ? temperature : 0.7,
    });

    for await (const chunk of responseStream) {
      const c = chunk as GenerateContentResponse;
      if (c.text) {
        res.write(`data: ${JSON.stringify({ text: c.text })}\n\n`);
      }
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error: any) {
    console.error("AI Chat API Error:", error);
    const parsed = parseGenAIError(error);
    if (!res.headersSent) {
      res.status(parsed.status).json({ error: parsed.message });
    } else {
      res.write(`data: ${JSON.stringify({ text: `\n\n⚠️ **API Notice**: ${parsed.message}` })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    }
  }
});

// -------------------------------------------------------------
// 1B. SINGLE-SHOT AI QUESTION / TASK ENDPOINT (/api/ai/ask)
// Used by CBT Question Generator, LMS Assistant, and direct queries
// -------------------------------------------------------------
app.post("/api/ai/ask", async (req, res) => {
  try {
    const { 
      prompt, 
      mode = "tutor", 
      role = "student",
      subject,
      classGrade,
      count,
      difficulty,
      bloomLevel
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    let ai;
    try {
      ai = getGenAI();
    } catch (keyErr: any) {
      const parsed = parseGenAIError(keyErr);
      return res.status(parsed.status).json({ error: parsed.message });
    }

    let specializedInstruction = MASTER_EDUKENZA_SYSTEM_PROMPT;

    if (mode === "teacher_quiz") {
      specializedInstruction += `\n\nTASK: GENERATE HIGH-QUALITY CURRICULUM QUESTIONS IN STRICT JSON FORMAT.
Return ONLY a valid JSON array of questions matching this exact TypeScript structure without markdown code fences if possible:
[
  {
    "title": "string (clear, rigorous question text)",
    "type": "mcq",
    "difficulty": "Easy" | "Medium" | "Hard",
    "bloomLevel": "Remembering" | "Understanding" | "Applying" | "Analyzing" | "Evaluating" | "Creating",
    "points": 5,
    "options": [
      { "id": "opt_1", "text": "Option A text", "isCorrect": true, "explanation": "Why this is correct" },
      { "id": "opt_2", "text": "Option B text", "isCorrect": false },
      { "id": "opt_3", "text": "Option C text", "isCorrect": false },
      { "id": "opt_4", "text": "Option D text", "isCorrect": false }
    ],
    "explanation": "Detailed step-by-step reasoning",
    "markingScheme": "1 mark per correct reasoning element",
    "tags": ["Subject", "Topic"]
  }
]`;
    } else if (mode === "math") {
      specializedInstruction += `\n\nTASK: STEP-BY-STEP MATHEMATICAL SOLUTION.
Solve with rigor:
1. GIVEN: List known quantities.
2. FORMULA: State formulas applied.
3. SUBSTITUTION & CALCULATION: Step-by-step arithmetic.
4. FINAL ANSWER: In bold with LaTeX ($...$).`;
    } else if (mode === "summary") {
      specializedInstruction += `\n\nTASK: COMPREHENSIVE EDUCATIONAL LESSON SUMMARY.
Provide:
1. Core Definitions
2. Key Conceptual Principles
3. Real-world Application
4. Summary Flashcards`;
    } else if (mode === "lesson_plan") {
      specializedInstruction += `\n\nTASK: DETAILED CLASSROOM LESSON PLAN.
Provide:
1. Learning Objectives (Bloom's Taxonomy)
2. Starter Activity (10 Mins)
3. Direct Educator Instruction (25 Mins)
4. Hands-on Classroom Activity (15 Mins)
5. Formative Assessment & Plenary (10 Mins)
6. Complete Marking Memorandum`;
    }

    const result = await generateGeminiContentWithFallback(ai, {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: specializedInstruction,
      temperature: 0.7
    });

    res.json({
      success: true,
      text: result.text,
      modelUsed: result.modelUsed
    });
  } catch (error: any) {
    console.error("AI Ask API Error:", error);
    const parsed = parseGenAIError(error);
    res.status(parsed.status).json({ error: parsed.message });
  }
});

// -------------------------------------------------------------
// 2. HIGH-QUALITY EDUCATIONAL IMAGE GENERATION
// -------------------------------------------------------------
app.post("/api/ai/generate-image", async (req, res) => {
  try {
    const { 
      prompt, 
      category = "general", 
      aspectRatio = "1:1", 
      quality = "high", 
      count = 1 
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Image generation prompt is required." });
    }

    let ai;
    try {
      ai = getGenAI();
    } catch (keyErr: any) {
      const parsed = parseGenAIError(keyErr);
      return res.status(parsed.status).json({ error: parsed.message });
    }

    // Select model based on requested quality
    const modelName = quality === "ultra" || quality === "high" 
      ? "gemini-3.1-flash-image" 
      : "gemini-3.1-flash-lite-image";

    const enhancedPrompt = `High-resolution, classroom-quality educational diagram, accurate scientific illustration of ${prompt}. Category: ${category}. Clear visual layout with labeled annotations, crisp line art, vibrant contrast, accurate educational detail, clean textbook aesthetic, 8k resolution.`;

    const generatedImages: string[] = [];
    const iterations = Math.min(Math.max(Number(count) || 1, 1), 4);

    for (let i = 0; i < iterations; i++) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [{ text: enhancedPrompt }]
          },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio || "1:1",
              ...(modelName === "gemini-3.1-flash-image" ? { imageSize: "1K" } : {})
            }
          }
        });

        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData?.data) {
              const base64Str = part.inlineData.data;
              const mimeType = part.inlineData.mimeType || "image/png";
              generatedImages.push(`data:${mimeType};base64,${base64Str}`);
            }
          }
        }
      } catch (genErr: any) {
        // Fallback to visual educational generator if Gemini image model hits free-tier rate limit or quota
        console.log("Using educational image generator fallback for prompt:", prompt);
        const cleanPrompt = encodeURIComponent(prompt.slice(0, 80));
        const fallbackUrl = `https://image.pollinations.ai/prompt/educational%20illustration%20of%20${cleanPrompt}?width=800&height=800&nologo=true`;
        generatedImages.push(fallbackUrl);
      }
    }

    if (generatedImages.length === 0) {
      // Fallback placeholder image if model returns text only
      const fallbackUrl = `https://picsum.photos/seed/${encodeURIComponent(prompt.slice(0, 15))}/800/800`;
      generatedImages.push(fallbackUrl);
    }

    res.json({ images: generatedImages, prompt, category });
  } catch (error: any) {
    console.error("Generate Image API Error:", error);
    const parsed = parseGenAIError(error);
    res.status(parsed.status).json({ error: parsed.message });
  }
});

// -------------------------------------------------------------
// 3. IMAGE EDITING & ANNOTATION ENDPOINT
// -------------------------------------------------------------
app.post("/api/ai/edit-image", async (req, res) => {
  try {
    const { imageBase64, editType = "improve", instruction = "" } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Base64 image input is required." });
    }

    let ai;
    try {
      ai = getGenAI();
    } catch (keyErr: any) {
      const parsed = parseGenAIError(keyErr);
      return res.status(parsed.status).json({ error: parsed.message });
    }

    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    let promptText = `Modify this educational diagram/image according to instruction: ${instruction}.`;
    if (editType === "remove_bg") {
      promptText = "Remove background cleanly, preserving only the main educational diagram/subject on a pure neutral background.";
    } else if (editType === "add_labels") {
      promptText = `Add clean, high-legibility anatomical/diagrammatic text labels and leader lines to key elements: ${instruction}.`;
    } else if (editType === "add_arrows") {
      promptText = `Add clear directional pointers and callout arrows highlighting key parts: ${instruction}.`;
    } else if (editType === "variations") {
      promptText = "Generate a stylized, highly clear educational textbook vector variation of this image.";
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: "image/png"
            }
          },
          { text: promptText }
        ]
      }
    });

    let resultImage = "";
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || "image/png";
          resultImage = `data:${mime};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!resultImage) {
      resultImage = imageBase64; // Fallback to original
    }

    res.json({ image: resultImage, editType, text: response.text || "Image edit complete." });
  } catch (error: any) {
    console.error("Edit Image API Error:", error);
    const parsed = parseGenAIError(error);
    res.status(parsed.status).json({ error: parsed.message });
  }
});

// -------------------------------------------------------------
// 4. DOCUMENT AI & MULTIMODAL ANALYSIS
// -------------------------------------------------------------
app.post("/api/ai/document-analysis", async (req, res) => {
  try {
    const { 
      fileContent, 
      fileName = "Document", 
      mimeType = "text/plain", 
      task = "summarize", 
      customPrompt = "" 
    } = req.body;

    if (!fileContent) {
      return res.status(400).json({ error: "File content is required for analysis." });
    }

    let ai;
    try {
      ai = getGenAI();
    } catch (keyErr: any) {
      const parsed = parseGenAIError(keyErr);
      return res.status(parsed.status).json({ error: parsed.message });
    }

    let taskInstruction = "";
    if (task === "summarize") {
      taskInstruction = "Provide a comprehensive executive summary of this document, broken down into Key Takeaways, Detailed Sections, and Essential Definitions.";
    } else if (task === "generate_quiz") {
      taskInstruction = "Generate a 5-question multiple-choice practice quiz with correct answers and explanations based on this document content.";
    } else if (task === "generate_flashcards") {
      taskInstruction = "Generate 6 key flashcards (Question & Answer pairs) covering core concepts in this document.";
    } else if (task === "extract_key_points") {
      taskInstruction = "Extract all critical definitions, key equations, and bullet-point summary facts from this document.";
    } else if (task === "explain") {
      taskInstruction = "Explain the concepts in this document in simple, clear educational language with relatable real-world analogies.";
    } else if (task === "translate") {
      taskInstruction = `Translate key sections of this document into clear, grammatically accurate ${customPrompt || "isiZulu, Afrikaans, or English"}.`;
    } else {
      taskInstruction = customPrompt || "Analyze this document thoroughly and answer all questions.";
    }

    const parts: any[] = [];

    if (mimeType.startsWith("image/") || mimeType === "application/pdf") {
      const cleanBase64 = fileContent.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: mimeType === "application/pdf" ? "application/pdf" : mimeType
        }
      });
    } else {
      // Text / Markdown / Extracted Document Content
      parts.push({ text: `DOCUMENT TITLE: ${fileName}\n\nCONTENT:\n${fileContent}` });
    }

    parts.push({ text: `INSTRUCTION: ${taskInstruction}` });

    const result = await generateGeminiContentWithFallback(ai, {
      contents: { parts },
      systemInstruction: `${MASTER_EDUKENZA_SYSTEM_PROMPT}\n\nYou are an expert Educational Document AI. Format output clearly with structured markdown headings, tables, bullet points, and KaTeX math ($...$) where applicable.`
    });

    res.json({ analysis: result.text, task, fileName, modelUsed: result.modelUsed });
  } catch (error: any) {
    console.error("Document AI API Error:", error);
    const parsed = parseGenAIError(error);
    res.status(parsed.status).json({ error: parsed.message });
  }
});

// -------------------------------------------------------------
// 5. LESSON PLANNER ENDPOINT
// -------------------------------------------------------------
app.post("/api/ai/lesson-planner", async (req, res) => {
  try {
    const { grade = "Grade 10", subject = "Biology", topic = "Cellular Structure & Function", duration = "60 Minutes", curriculum = "CAPS / IEB" } = req.body;

    let ai;
    try {
      ai = getGenAI();
    } catch (keyErr: any) {
      const parsed = parseGenAIError(keyErr);
      return res.status(parsed.status).json({ error: parsed.message });
    }

    const prompt = `Create a professional, highly detailed, classroom-ready Lesson Plan for ${grade} ${subject} on the topic "${topic}".
Duration: ${duration}. Curriculum Standard: ${curriculum}.

Please include the following formatted sections:
1. Lesson Overview & CAPS/IEB Learning Objectives
2. Required Teaching Resources & Visual Aids
3. Starter Activity (10 Mins)
4. Core Educator Explanation & Guided Teaching (25 Mins)
5. Practical / Hands-on Activity or Experiment (15 Mins)
6. Assessment for Learning & Plenary Quiz (10 Mins)
7. Homework / Follow-Up Task
8. Complete Assessment Marking Scheme & Rubric
9. Recommended Educational Diagram Description (for AI Image Generator)`;

    const result = await generateGeminiContentWithFallback(ai, {
      contents: prompt,
      systemInstruction: `${MASTER_EDUKENZA_SYSTEM_PROMPT}\n\nYou are a Master Curriculum Specialist and Teacher Educator. Output pristine, comprehensive, beautifully formatted lesson plans with markdown tables and bullet lists.`
    });

    res.json({ lessonPlan: result.text, grade, subject, topic, modelUsed: result.modelUsed });
  } catch (error: any) {
    console.error("Lesson Planner API Error:", error);
    const parsed = parseGenAIError(error);
    res.status(parsed.status).json({ error: parsed.message });
  }
});

// -------------------------------------------------------------
// 6. QUIZ & ASSIGNMENT GENERATOR ENDPOINT
// -------------------------------------------------------------
app.post("/api/ai/quiz-generator", async (req, res) => {
  try {
    const { topic = "Photosynthesis & Respiration", grade = "Grade 11", subject = "Physical Sciences", numQuestions = 5, difficulty = "Medium" } = req.body;

    let ai;
    try {
      ai = getGenAI();
    } catch (keyErr: any) {
      const parsed = parseGenAIError(keyErr);
      return res.status(parsed.status).json({ error: parsed.message });
    }

    const prompt = `Generate a complete school Quiz & Assignment for ${grade} ${subject} on "${topic}". Difficulty: ${difficulty}.
Include ${numQuestions} questions ranging from Multiple Choice to Short Answer and Problem Solving.

Provide:
1. Student Question Sheet
2. Complete Teacher Marking Memorandum
3. Assessment Rubric Matrix (4 Criteria)
4. Recommended Diagram Prompt for insertion into assignment`;

    const result = await generateGeminiContentWithFallback(ai, {
      contents: prompt,
      systemInstruction: `${MASTER_EDUKENZA_SYSTEM_PROMPT}\n\nYou are an Assessment & Examination Specialist. Output high-quality quizzes and assignments with student question sheets, detailed teacher marking memoranda, rubric matrices, and diagram recommendations.`
    });

    res.json({ quiz: result.text, topic, grade, subject, modelUsed: result.modelUsed });
  } catch (error: any) {
    console.error("Quiz Generator API Error:", error);
    const parsed = parseGenAIError(error);
    res.status(parsed.status).json({ error: parsed.message });
  }
});

// -------------------------------------------------------------
// 7. REPORT WRITER ENDPOINT
// -------------------------------------------------------------
app.post("/api/ai/report-writer", async (req, res) => {
  try {
    const { 
      studentName = "Student", 
      grade = "Grade 10", 
      subjectScores = "Mathematics: 78%, Physical Sciences: 82%, English: 74%", 
      attendance = "96%", 
      role = "teacher" 
    } = req.body;

    let ai;
    try {
      ai = getGenAI();
    } catch (keyErr: any) {
      const parsed = parseGenAIError(keyErr);
      return res.status(parsed.status).json({ error: parsed.message });
    }

    let prompt = "";
    if (role === "parent") {
      prompt = `Provide a clear, encouraging analysis of ${studentName}'s report card for parents. Scores: ${subjectScores}. Attendance: ${attendance}.
Explain:
1. Key Strengths & Achievements
2. Areas Needing Support
3. 3 Practical At-Home Study Strategies for Parents`;
    } else if (role === "school_admin" || role === "platform_owner") {
      prompt = `Generate an executive School Performance Summary and Enrollment Analysis Report based on data: ${subjectScores}. Include key trends, pass rates, and strategic recommendations for school improvement.`;
    } else {
      prompt = `Generate comprehensive, professional Report Card Comments for ${studentName} (${grade}). Scores: ${subjectScores}. Attendance: ${attendance}.
Include:
1. Academic Performance Summary
2. Subject-Specific Commendations
3. Target Action Plan for Next Term`;
    }

    const result = await generateGeminiContentWithFallback(ai, {
      contents: prompt,
      systemInstruction: `${MASTER_EDUKENZA_SYSTEM_PROMPT}\n\nYou are an Educational Communications & Evaluation Specialist. Generate insightful academic reports, commendations, and constructive action plans tailored for teachers, parents, or administrators.`
    });

    res.json({ report: result.text, studentName, modelUsed: result.modelUsed });
  } catch (error: any) {
    console.error("Report Writer API Error:", error);
    const parsed = parseGenAIError(error);
    res.status(parsed.status).json({ error: parsed.message });
  }
});

// -------------------------------------------------------------
// 8. SERVER-SIDE FIRESTORE DEBUG UTILITIES
// -------------------------------------------------------------

function sanitizeEnvVal(val: any): string | undefined {
  if (typeof val !== 'string') return undefined;
  const cleaned = val.replace(/^["']|["',]+$/g, '').trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

function getFirebaseConfig() {
  let fileConfig: any = {};
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, "utf-8");
      fileConfig = JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to read firebase-applet-config.json", e);
  }

  let pid = sanitizeEnvVal(process.env.VITE_FIREBASE_PROJECT_ID) || sanitizeEnvVal(process.env.FIREBASE_PROJECT_ID) || fileConfig.projectId || "edukenza-2ab0";
  if (pid.includes("edukenza-2abc0") || !pid) {
    pid = "edukenza-2ab0";
  }

  let authDom = sanitizeEnvVal(process.env.VITE_FIREBASE_AUTH_DOMAIN) || fileConfig.authDomain || "edukenza-2ab0.firebaseapp.com";
  if (authDom.includes("edukenza-2abc0") || !authDom) {
    authDom = "edukenza-2ab0.firebaseapp.com";
  }

  let storBucket = sanitizeEnvVal(process.env.VITE_FIREBASE_STORAGE_BUCKET) || fileConfig.storageBucket || "edukenza-2ab0.firebasestorage.app";
  if (storBucket.includes("edukenza-2abc0") || !storBucket) {
    storBucket = "edukenza-2ab0.firebasestorage.app";
  }

  const dbId = "ai-studio-remixedukenza-e7c63526-01e3-4b16-897a-39990509a023";
  const apiKey = sanitizeEnvVal(process.env.VITE_FIREBASE_API_KEY) || fileConfig.apiKey || "AIzaSyCbIbeyet9cOf1V18cmB7rQfrbwERNltAI";

  return {
    projectId: pid,
    firestoreDatabaseId: dbId,
    apiKey,
    authDomain: authDom,
    storageBucket: storBucket
  };
}

let serverDbInstance: any = null;
function getServerFirestore() {
  if (!serverDbInstance) {
    const config = getFirebaseConfig();
    const existing = getApps().find(a => a.name === "server-debug-app");
    const serverApp = existing || initializeApp(config, "server-debug-app");
    serverDbInstance = config.firestoreDatabaseId
      ? getFirestore(serverApp, config.firestoreDatabaseId)
      : getFirestore(serverApp);
  }
  return serverDbInstance;
}

// Endpoint: Real-time Firebase Authentication Provider Health Check
app.get("/api/auth/status", async (req, res) => {
  const config = getFirebaseConfig();
  const apiKey = config.apiKey || "AIzaSyCbIbeyet9cOf1V18cmB7rQfrbwERNltAI";
  const projectId = config.projectId || "edukenza-2ab0";

  try {
    const probeRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "probe_test@edukenza.internal",
          password: "probepassword123",
          returnSecureToken: true
        })
      }
    );

    const probeData = await probeRes.json();
    const errorMsg = probeData?.error?.message || "";

    const isPasswordDisabled =
      errorMsg.includes("PASSWORD_LOGIN_DISABLED") ||
      errorMsg.includes("OPERATION_NOT_ALLOWED");

    res.json({
      projectId,
      firestoreDatabaseId: config.firestoreDatabaseId,
      apiKeyPresent: !!apiKey,
      emailPasswordProviderEnabled: !isPasswordDisabled,
      rawStatus: errorMsg || "OK",
      instructions: isPasswordDisabled
        ? {
            status: "DISABLED",
            actionRequired: "Enable Email/Password sign-in provider in Firebase Console.",
            consoleUrl: `https://console.firebase.google.com/project/${projectId}/authentication/providers`,
            steps: [
              "1. Open the Firebase Console URL above.",
              "2. Under 'Sign-in providers', select 'Email/Password'.",
              "3. Enable the 'Email/Password' toggle.",
              "4. Click 'Save'."
            ]
          }
        : {
            status: "ENABLED",
            message: "Email/Password sign-in provider is active."
          },
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({
      projectId,
      error: err?.message || "Failed to check Firebase Auth status"
    });
  }
});

// Endpoint: Server-Side Firestore User Record Verification
app.get("/api/debug/check-user", async (req, res) => {
  const emailParam = String(req.query.email || "").trim().toLowerCase();
  const config = getFirebaseConfig();

  if (!emailParam) {
    return res.status(400).json({ error: "Missing email parameter" });
  }

  try {
    const db = getServerFirestore();
    const usersCol = collection(db, "users");
    const q = query(usersCol, where("email", "==", emailParam));
    const snap = await getDocs(q);

    const matches: any[] = [];
    snap.forEach((d) => {
      matches.push({ id: d.id, ...d.data() });
    });

    const first = matches[0] || null;

    res.json({
      projectId: config.projectId,
      firestoreDatabaseId: config.firestoreDatabaseId,
      targetEmail: emailParam,
      recordExists: matches.length > 0,
      storedUid: first?.id || null,
      userData: first,
      allMatchingRecords: matches,
      count: matches.length,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error("[CHECK-USER ERROR]", err);
    res.status(500).json({
      projectId: config.projectId,
      firestoreDatabaseId: config.firestoreDatabaseId,
      error: err?.message || "Failed to query Firestore users collection"
    });
  }
});

// =============================================================
// 9. PAYSTACK FINANCIAL & PAYMENT ENGINE (EDUkenZA OFFICIAL)
// =============================================================

/**
 * Returns safe public configuration for Paystack.
 * Never exposes the PAYSTACK_SECRET_KEY.
 */
app.get("/api/payments/paystack/config", (req, res) => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim() || "";
  const publicKey = process.env.PAYSTACK_PUBLIC_KEY?.trim() || "";

  const isConfigured = Boolean(secretKey && secretKey.length > 10);
  const isPublicKeyAvailable = Boolean(publicKey && publicKey.length > 5);

  let mode: "live" | "test" | "unconfigured" = "unconfigured";
  if (secretKey.startsWith("sk_live_")) {
    mode = "live";
  } else if (secretKey.startsWith("sk_test_")) {
    mode = "test";
  } else if (secretKey) {
    mode = "test";
  }

  res.json({
    success: true,
    provider: "Paystack",
    configured: isConfigured,
    publicKey: isPublicKeyAvailable ? publicKey : null,
    mode,
    currency: "GHS",
    supportedChannels: ["mobile_money", "card", "bank_transfer"],
    message: isConfigured 
      ? `Paystack is configured in ${mode.toUpperCase()} mode.`
      : "PAYMENT PROVIDER CONFIGURATION: MISSING / INCOMPLETE (PAYSTACK_SECRET_KEY required on server)"
  });
});

/**
 * Helper to process atomic settlement of a verified Paystack transaction.
 * Enforces IDEMPOTENCY: if a transaction is already processed, it will not credit again.
 */
async function processVerifiedPaystackTransaction(paystackData: any) {
  const db = getServerFirestore();
  const reference = paystackData.reference;
  const paidAmountInSubunits = Number(paystackData.amount);
  const paidAmount = Number((paidAmountInSubunits / 100).toFixed(2));
  const currency = paystackData.currency || "GHS";
  const channel = paystackData.channel || "card";
  const payerEmail = paystackData.customer?.email || "";
  const metadata = paystackData.metadata || {};

  const schoolId = metadata.schoolId || "";
  const studentId = metadata.studentId || "";
  const studentUid = metadata.studentUid || metadata.studentId || "";
  const studentName = metadata.studentName || "Student";
  const payerName = metadata.payerName || "Parent/Payer";
  const payerUid = metadata.payerUid || "";
  const invoiceId = metadata.invoiceId || "";
  const invoiceType = metadata.invoiceType || "student_invoice"; // 'student_invoice' | 'billing_invoice' | 'wallet_topup' | 'daily_service'
  const feeType = metadata.feeType || "School Fee Payment";
  const walletTargetId = metadata.walletId || studentId;

  const now = new Date().toISOString();
  const receiptNumber = `REC-EDUK-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

  let settlementResult = {
    alreadyProcessed: false,
    success: true,
    reference,
    receiptNumber,
    amount: paidAmount,
    currency,
    invoiceType,
    schoolId,
    studentId,
    studentUid
  };

  const paymentDocRef = doc(db, "payments", reference);
  const invoiceRef = (invoiceType === "student_invoice" && invoiceId) ? doc(db, "studentInvoices", invoiceId) : null;
  const billingRef = (invoiceType === "billing_invoice" && invoiceId) ? doc(db, "billingInvoices", invoiceId) : null;
  const walletRef = (invoiceType === "wallet_topup" && walletTargetId) ? doc(db, "studentWallets", walletTargetId) : null;

  await runTransaction(db, async (transaction) => {
    // -------------------------------------------------------------
    // PHASE 1: TRANSACTIONAL READS (MUST OCCUR BEFORE ANY WRITES)
    // -------------------------------------------------------------
    const paymentSnap = await transaction.get(paymentDocRef);
    const invoiceSnap = invoiceRef ? await transaction.get(invoiceRef) : null;
    const billingSnap = billingRef ? await transaction.get(billingRef) : null;
    const walletSnap = walletRef ? await transaction.get(walletRef) : null;

    // Idempotency check: if already settled, terminate without double crediting
    if (paymentSnap.exists() && paymentSnap.data()?.status === "successful") {
      console.log(`[PAYSTACK IDEMPOTENCY] Transaction reference ${reference} was already settled. Skipping duplicate financial effect.`);
      settlementResult.alreadyProcessed = true;
      settlementResult.receiptNumber = paymentSnap.data()?.receiptNumber || receiptNumber;
      return;
    }

    // -------------------------------------------------------------
    // PHASE 2: TRANSACTIONAL WRITES
    // -------------------------------------------------------------

    // 1. Settle Student Invoice
    if (invoiceSnap && invoiceSnap.exists()) {
      const invData = invoiceSnap.data();
      const currentPaid = Number(invData.amountPaid || 0);
      const totalAmount = Number(invData.totalAmount || 0);
      const newPaid = Number((currentPaid + paidAmount).toFixed(2));
      const newOutstanding = Math.max(0, Number((totalAmount - newPaid).toFixed(2)));
      const newStatus = newOutstanding <= 0 ? "Paid" : "Partially Paid";

      transaction.update(invoiceRef!, {
        amountPaid: newPaid,
        outstandingBalance: newOutstanding,
        status: newStatus,
        lastPaymentDate: now,
        updatedAt: now
      });
    }

    // 2. Settle School Billing Subscription Invoice
    if (billingSnap && billingSnap.exists()) {
      transaction.update(billingRef!, {
        status: "paid",
        paidDate: now,
        updatedAt: now
      });
    }

    // 3. Settle Student Digital Wallet Top-Up
    if (walletRef) {
      let previousBalance = 0;
      let walletData: any = null;

      if (walletSnap && walletSnap.exists()) {
        walletData = walletSnap.data();
        previousBalance = Number(walletData.balance || 0);
      }

      const newBalance = Number((previousBalance + paidAmount).toFixed(2));

      if (walletSnap && walletSnap.exists()) {
        transaction.update(walletRef, {
          balance: newBalance,
          lastUpdated: now
        });
      } else {
        transaction.set(walletRef, {
          walletId: walletTargetId,
          studentId,
          studentUid,
          studentName,
          schoolId,
          balance: newBalance,
          currency,
          status: "active",
          dailyLimit: 50,
          dailySpent: 0,
          weeklyLimit: 250,
          weeklySpent: 0,
          monthlyLimit: 1000,
          monthlySpent: 0,
          autoTopUpEnabled: false,
          disabledCategories: [],
          lastUpdated: now,
          createdAt: now
        });
      }

      // Add immutable wallet transaction record
      const walletTxnRef = doc(collection(db, "walletTransactions"));
      transaction.set(walletTxnRef, {
        id: walletTxnRef.id,
        walletId: walletData?.walletId || walletTargetId,
        studentId,
        studentUid,
        studentName,
        schoolId,
        type: "topup",
        amount: paidAmount,
        previousBalance,
        newBalance,
        description: `Paystack Online Top-Up (${channel.toUpperCase()})`,
        category: "Top Up",
        paymentMethod: `paystack_${channel}`,
        reference,
        date: now,
        processedBy: "Paystack Gateway Server",
        status: "successful"
      });
    }

    // 4. Save Authoritative Payment Record in 'payments'
    const paymentPayload = {
      id: reference,
      receiptNumber,
      reference,
      paystackId: paystackData.id || "",
      schoolId,
      studentId,
      studentUid,
      studentName,
      parentName: payerName,
      parentEmail: payerEmail,
      payerUid,
      invoiceId,
      invoiceType,
      feeType,
      amount: paidAmount,
      amountPaid: paidAmount,
      currency,
      paymentMethod: `Paystack (${channel.toUpperCase()})`,
      gatewayProvider: "Paystack",
      channel,
      status: "successful",
      datePaid: now.split("T")[0],
      createdAt: now,
      paidAt: now,
      verifiedBy: "Paystack Authoritative Backend Settlement"
    };

    transaction.set(paymentDocRef, paymentPayload, { merge: true });

    // 5. Create Official Immutable Payment Receipt in 'paymentReceipts'
    const receiptDocRef = doc(db, "paymentReceipts", reference);
    transaction.set(receiptDocRef, {
      ...paymentPayload,
      receiptId: reference,
      isImmutable: true
    });

    // 6. Financial Audit Log
    const auditDocRef = doc(collection(db, "auditLogs"));
    transaction.set(auditDocRef, {
      logId: auditDocRef.id,
      action: invoiceType === "wallet_topup" ? "WALLET_CREDITED" : "INVOICE_SETTLED",
      performedBy: payerEmail || "Paystack Gateway",
      performedByEmail: payerEmail || "paystack_webhook",
      schoolId,
      details: `Verified Paystack payment of ${currency} ${paidAmount.toFixed(2)} for ${studentName} (${feeType}). Ref: ${reference}`,
      ipAddress: "Server-Authoritative",
      timestamp: now
    });

    // 7. Notification for parent & student
    if (studentId || payerUid) {
      const notifDocRef = doc(collection(db, "notifications"));
      transaction.set(notifDocRef, {
        notificationId: notifDocRef.id,
        recipientId: payerUid || studentId,
        recipientRole: payerUid ? "parent" : "student",
        schoolId,
        title: `Payment Confirmed: ${currency} ${paidAmount.toFixed(2)}`,
        message: `Your payment of ${currency} ${paidAmount.toFixed(2)} (${feeType}) has been verified. Receipt #${receiptNumber}.`,
        type: "Payment",
        priority: "High",
        isRead: false,
        createdAt: now,
        createdBy: "Paystack Billing System"
      });
    }
  });

  return settlementResult;
}

/**
 * Endpoint: POST /api/payments/paystack/initialize
 * Creates a server-side Paystack transaction using PAYSTACK_SECRET_KEY.
 * Authoritatively validates school isolation and fee amounts.
 */
app.post("/api/payments/paystack/initialize", async (req, res) => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secretKey) {
    return res.status(400).json({
      success: false,
      error: "PAYMENT_PROVIDER_UNCONFIGURED",
      message: "Paystack secret key is missing on the server. Configure PAYSTACK_SECRET_KEY in server secrets."
    });
  }

  const {
    invoiceId,
    invoiceType = "student_invoice",
    schoolId,
    studentId,
    studentName,
    payerEmail,
    payerName,
    payerUid,
    amount,
    currency = "GHS",
    feeType = "School Tuition / Service Fee",
    callbackUrl
  } = req.body;

  if (!payerEmail) {
    return res.status(400).json({
      success: false,
      error: "INVALID_PAYER_EMAIL",
      message: "A valid payer email is required to initialize payment."
    });
  }

  if (!schoolId) {
    return res.status(400).json({
      success: false,
      error: "MISSING_SCHOOL_ID",
      message: "schoolId is required for financial isolation."
    });
  }

  const db = getServerFirestore();
  let payableAmount = Number(amount);

  try {
    // Authoritative Amount & School Isolation Verification from Firestore
    if (invoiceType === "student_invoice" && invoiceId) {
      const invRef = doc(db, "studentInvoices", invoiceId);
      const invSnap = await getDoc(invRef);
      if (!invSnap.exists()) {
        return res.status(404).json({
          success: false,
          error: "INVOICE_NOT_FOUND",
          message: `Student invoice ${invoiceId} does not exist in the database.`
        });
      }
      const invData = invSnap.data();
      // Enforce school isolation
      if (invData.schoolId && invData.schoolId !== schoolId) {
        return res.status(403).json({
          success: false,
          error: "CROSS_TENANT_FORBIDDEN",
          message: "School ID mismatch: Cross-tenant payment forbidden."
        });
      }

      const outstanding = Number(invData.outstandingBalance !== undefined ? invData.outstandingBalance : invData.totalAmount);
      if (payableAmount <= 0 || isNaN(payableAmount)) {
        payableAmount = outstanding;
      } else if (payableAmount > outstanding) {
        // Enforce maximum payable
        payableAmount = outstanding;
      }
    } else if (invoiceType === "billing_invoice" && invoiceId) {
      const billingRef = doc(db, "billingInvoices", invoiceId);
      const billingSnap = await getDoc(billingRef);
      if (!billingSnap.exists()) {
        return res.status(404).json({
          success: false,
          error: "INVOICE_NOT_FOUND",
          message: `Billing invoice ${invoiceId} does not exist.`
        });
      }
      const bData = billingSnap.data();
      if (bData.schoolId && bData.schoolId !== schoolId) {
        return res.status(403).json({
          success: false,
          error: "CROSS_TENANT_FORBIDDEN",
          message: "School ID mismatch for SaaS subscription invoice."
        });
      }
      payableAmount = Number(bData.totalAmount);
    } else if (invoiceType === "wallet_topup") {
      if (!payableAmount || payableAmount <= 0 || payableAmount > 50000) {
        return res.status(400).json({
          success: false,
          error: "INVALID_TOPUP_AMOUNT",
          message: "Top-up amount must be a positive amount up to GHS 50,000."
        });
      }
    }

    if (!payableAmount || payableAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: "ZERO_AMOUNT",
        message: "Payable amount must be greater than zero."
      });
    }

    // Generate unique EDUkenZA internal transaction reference
    const uniqueRef = `EDK-${new Date().getFullYear()}-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const amountInSubunits = Math.round(payableAmount * 100); // Pesewas (GHS) or Cents (USD)

    const paystackPayload = {
      email: payerEmail.trim().toLowerCase(),
      amount: amountInSubunits,
      currency: currency.toUpperCase(),
      reference: uniqueRef,
      callback_url: callbackUrl || undefined,
      metadata: {
        schoolId,
        studentId: studentId || "",
        studentName: studentName || "Student",
        payerName: payerName || "Parent/Payer",
        payerUid: payerUid || "",
        invoiceId: invoiceId || "",
        invoiceType,
        feeType,
        custom_fields: [
          { display_name: "School ID", variable_name: "school_id", value: schoolId },
          { display_name: "Student Name", variable_name: "student_name", value: studentName || "N/A" },
          { display_name: "Fee Type", variable_name: "fee_type", value: feeType }
        ]
      }
    };

    console.log(`[PAYSTACK INITIALIZE] Calling Paystack API for ref ${uniqueRef}, amount ${amountInSubunits} subunits (${currency} ${payableAmount})`);

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(paystackPayload)
    });

    const responseData: any = await response.json();

    if (!response.ok || !responseData.status) {
      console.error("[PAYSTACK INITIALIZE ERROR]", responseData);
      return res.status(response.status || 400).json({
        success: false,
        error: "PAYSTACK_INIT_FAILED",
        message: responseData.message || "Failed to initialize Paystack transaction."
      });
    }

    // Pre-record pending payment in Firestore
    const paymentsCol = collection(db, "payments");
    await addDoc(paymentsCol, {
      reference: uniqueRef,
      accessCode: responseData.data.access_code,
      schoolId,
      studentId: studentId || "",
      studentUid: (req.body?.studentUid || studentId || ""),
      studentName: studentName || "",
      parentEmail: payerEmail,
      parentName: payerName || "",
      payerUid: payerUid || "",
      invoiceId: invoiceId || "",
      invoiceType,
      feeType,
      amount: payableAmount,
      currency,
      status: "pending",
      gatewayProvider: "Paystack",
      createdAt: new Date().toISOString()
    });

    return res.json({
      success: true,
      reference: uniqueRef,
      authorizationUrl: responseData.data.authorization_url,
      accessCode: responseData.data.access_code,
      publicKey: process.env.PAYSTACK_PUBLIC_KEY || "",
      amount: payableAmount,
      currency,
      message: "Paystack checkout initialized successfully."
    });
  } catch (error: any) {
    console.error("[PAYSTACK INITIALIZE EXCEPTION]", error);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: error?.message || "Internal server error initializing payment."
    });
  }
});

/**
 * Endpoint: POST /api/payments/paystack/verify
 * Authoritatively verifies transaction with Paystack API using PAYSTACK_SECRET_KEY.
 * Atomic Firestore transaction guarantees idempotent settlement and immutable ledgering.
 */
app.post("/api/payments/paystack/verify", async (req, res) => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secretKey) {
    return res.status(400).json({
      success: false,
      error: "PAYMENT_PROVIDER_UNCONFIGURED",
      message: "Paystack secret key is missing on the server."
    });
  }

  const { reference } = req.body;
  if (!reference) {
    return res.status(400).json({
      success: false,
      error: "MISSING_REFERENCE",
      message: "Payment reference is required for verification."
    });
  }

  try {
    console.log(`[PAYSTACK VERIFY] Querying Paystack API for reference: ${reference}`);
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      }
    });

    const verifyData: any = await paystackRes.json();

    if (!paystackRes.ok || !verifyData.status) {
      console.warn(`[PAYSTACK VERIFY FAILED]`, verifyData);
      return res.status(400).json({
        success: false,
        error: "VERIFICATION_FAILED",
        message: verifyData.message || "Paystack transaction verification failed."
      });
    }

    const txnData = verifyData.data;

    if (txnData.status === "success") {
      console.log(`[PAYSTACK VERIFIED SUCCESS] Reference ${reference} paid ${txnData.amount} subunits via ${txnData.channel}`);
      const settlement = await processVerifiedPaystackTransaction(txnData);
      return res.json({
        success: true,
        status: "successful",
        alreadyProcessed: settlement.alreadyProcessed,
        receiptNumber: settlement.receiptNumber,
        reference,
        amount: settlement.amount,
        currency: settlement.currency,
        message: "Payment successfully verified and settled."
      });
    } else {
      // Record failed status
      const db = getServerFirestore();
      const paymentsCol = collection(db, "payments");
      const q = query(paymentsCol, where("reference", "==", reference));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, {
          status: txnData.status || "failed",
          gatewayResponse: txnData.gateway_response || "Payment not completed",
          updatedAt: new Date().toISOString()
        });
      }

      return res.status(400).json({
        success: false,
        status: txnData.status,
        message: txnData.gateway_response || `Payment status is ${txnData.status}.`
      });
    }
  } catch (error: any) {
    console.error("[PAYSTACK VERIFY EXCEPTION]", error);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: error?.message || "Internal server error verifying transaction."
    });
  }
});

/**
 * Endpoint: POST /api/payments/paystack/webhook
 * Receives asynchronous Paystack events (e.g., charge.success).
 * Authenticates cryptographically using HMAC-SHA512 with PAYSTACK_SECRET_KEY.
 */
app.post("/api/payments/paystack/webhook", async (req, res) => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secretKey) {
    console.warn("[PAYSTACK WEBHOOK] Received webhook but PAYSTACK_SECRET_KEY is not configured.");
    return res.status(400).send("Paystack secret key not configured.");
  }

  const signature = req.headers["x-paystack-signature"] as string;
  if (!signature) {
    console.warn("[PAYSTACK WEBHOOK] Missing x-paystack-signature header.");
    return res.status(401).send("Missing signature.");
  }

  try {
    const rawPayload = (req as any).rawBody || JSON.stringify(req.body);
    const hash = crypto.createHmac("sha512", secretKey).update(rawPayload).digest("hex");

    if (hash !== signature) {
      console.warn("[PAYSTACK WEBHOOK] Invalid HMAC signature.");
      return res.status(401).send("Invalid signature.");
    }

    const event = req.body;
    console.log(`[PAYSTACK WEBHOOK EVENT] Type: ${event?.event}, Ref: ${event?.data?.reference}`);

    if (event?.event === "charge.success") {
      await processVerifiedPaystackTransaction(event.data);
    }

    return res.status(200).json({ status: "ok", message: "Webhook processed." });
  } catch (err: any) {
    console.error("[PAYSTACK WEBHOOK ERROR]", err);
    return res.status(500).send("Webhook processing error.");
  }
});

// =============================================================
// 10. SERVER-AUTHORITATIVE STUDENT WALLET & DAILY SERVICES API
// =============================================================

/**
 * Endpoint: POST /api/wallet/topup
 * Strictly verifies amount, prevents duplicate refs, updates wallet atomically,
 * logs immutable transaction, and writes audit record.
 */
app.post("/api/wallet/topup", async (req, res) => {
  const { schoolId, studentId, studentName, amount, paymentMethod, reference, processedBy } = req.body;

  if (!schoolId || !studentId) {
    return res.status(400).json({ success: false, error: "MISSING_FIELDS", message: "schoolId and studentId are required" });
  }

  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount <= 0 || numericAmount > 50000) {
    return res.status(400).json({ success: false, error: "INVALID_AMOUNT", message: "Amount must be a positive number up to GHS 50,000" });
  }

  const validMethods = ["momo_mtn", "telecel_cash", "airteltigo", "card_visa_mc", "bank_transfer", "cash", "paystack"];
  const finalMethod = validMethods.includes(paymentMethod) ? paymentMethod : "cash";
  const finalRef = reference || `TOP-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const now = new Date().toISOString();

  try {
    const db = getServerFirestore();
    const result = await runTransaction(db, async (txn) => {
      // 1. Check duplicate reference
      const txnQuery = query(collection(db, "walletTransactions"), where("reference", "==", finalRef));
      const dupSnap = await getDocs(txnQuery);
      if (!dupSnap.empty) {
        throw new Error(`DUPLICATE_REFERENCE: Transaction reference ${finalRef} has already been processed.`);
      }

      // 2. Find or create student wallet
      const walletsCol = collection(db, "studentWallets");
      const wQuery = query(walletsCol, where("schoolId", "==", schoolId), where("studentId", "==", studentId));
      const wSnap = await getDocs(wQuery);

      let walletRef: any;
      let prevBalance = 0;
      let walletData: any = {};

      if (!wSnap.empty) {
        const wDoc = wSnap.docs[0];
        walletRef = doc(db, "studentWallets", wDoc.id);
        walletData = wDoc.data();
        if (walletData.schoolId !== schoolId) {
          throw new Error("CROSS_TENANT_VIOLATION: School ID mismatch.");
        }
        prevBalance = Number(walletData.balance) || 0;
      } else {
        walletRef = doc(walletsCol);
        walletData = {
          schoolId,
          studentId,
          studentName: studentName || "Student",
          className: "",
          walletId: `WAL-EDUK-${Math.floor(10000 + Math.random() * 90000)}`,
          qrCodeData: `EDUK-CARD-${studentId}`,
          nfcCardId: `NFC-${Math.floor(1000 + Math.random() * 9000)}`,
          balance: 0,
          currency: "GHS",
          dailyLimit: 50,
          dailySpent: 0,
          weeklyLimit: 250,
          weeklySpent: 0,
          monthlyLimit: 1000,
          monthlySpent: 0,
          autoTopUpEnabled: false,
          autoTopUpThreshold: 15,
          autoTopUpAmount: 50,
          disabledCategories: [],
          status: "active",
          createdAt: now
        };
        prevBalance = 0;
      }

      const newBalance = Number((prevBalance + numericAmount).toFixed(2));

      // Update wallet balance
      txn.set(walletRef, {
        ...walletData,
        balance: newBalance,
        lastUpdated: now
      }, { merge: true });

      // Create immutable transaction ledger record
      const txnDocRef = doc(collection(db, "walletTransactions"));
      const txnRecord = {
        id: txnDocRef.id,
        walletId: walletData.walletId || `WAL-EDUK-${studentId}`,
        studentId,
        studentName: studentName || walletData.studentName || "Student",
        schoolId,
        type: "topup",
        amount: numericAmount,
        previousBalance: prevBalance,
        newBalance,
        description: `Wallet Top-Up via ${finalMethod.toUpperCase()}`,
        category: "Top Up",
        paymentMethod: finalMethod,
        reference: finalRef,
        date: now,
        processedBy: processedBy || "Authoritative Gateway",
        status: "successful"
      };
      txn.set(txnDocRef, txnRecord);

      // Create Audit Log
      const auditDocRef = doc(collection(db, "auditLogs"));
      txn.set(auditDocRef, {
        logId: auditDocRef.id,
        action: "WALLET_TOPUP",
        schoolId,
        actorId: processedBy || "system",
        details: `Credited GHS ${numericAmount.toFixed(2)} to student ${studentId}. Previous: GHS ${prevBalance.toFixed(2)}, New: GHS ${newBalance.toFixed(2)}. Ref: ${finalRef}`,
        timestamp: now
      });

      return { newBalance, transactionId: txnDocRef.id, reference: finalRef };
    });

    return res.json({
      success: true,
      newBalance: result.newBalance,
      transactionId: result.transactionId,
      reference: result.reference,
      message: `Wallet successfully credited with GHS ${numericAmount.toFixed(2)}`
    });
  } catch (err: any) {
    console.error("[WALLET TOPUP ERROR]", err);
    return res.status(400).json({
      success: false,
      error: "TOPUP_FAILED",
      message: err?.message || "Failed to process wallet top-up"
    });
  }
});

/**
 * Endpoint: POST /api/wallet/purchase
 * Strictly verifies daily service status, student schoolId, spending limits,
 * and ensures balance is strictly sufficient before deducting.
 * NEVER allows negative balance.
 */
app.post("/api/wallet/purchase", async (req, res) => {
  const { schoolId, studentId, serviceId, processedBy } = req.body;

  if (!schoolId || !studentId || !serviceId) {
    return res.status(400).json({ success: false, error: "MISSING_FIELDS", message: "schoolId, studentId, and serviceId are required" });
  }

  const now = new Date().toISOString();

  try {
    const db = getServerFirestore();
    const result = await runTransaction(db, async (txn) => {
      // 1. Fetch Service
      const serviceRef = doc(db, "dailyServices", serviceId);
      const serviceSnap = await txn.get(serviceRef);
      if (!serviceSnap.exists()) {
        throw new Error("SERVICE_NOT_FOUND: The requested daily service does not exist.");
      }

      const serviceData = serviceSnap.data();
      if (serviceData.schoolId !== schoolId) {
        throw new Error("CROSS_TENANT_VIOLATION: Service does not belong to student's school.");
      }

      if (serviceData.status !== "active") {
        throw new Error(`SERVICE_INACTIVE: Service '${serviceData.name}' is currently suspended.`);
      }

      if (serviceData.walletEligible === false) {
        throw new Error(`SERVICE_NOT_WALLET_ELIGIBLE: Service '${serviceData.name}' cannot be paid with digital wallet.`);
      }

      const cost = Number(serviceData.dailyCost || serviceData.price || 0);
      if (cost <= 0) {
        throw new Error("INVALID_SERVICE_COST: Service price is not configured properly.");
      }

      // 2. Fetch Wallet
      const walletsCol = collection(db, "studentWallets");
      const wQuery = query(walletsCol, where("schoolId", "==", schoolId), where("studentId", "==", studentId));
      const wSnap = await getDocs(wQuery);

      if (wSnap.empty) {
        throw new Error("WALLET_NOT_FOUND: No digital wallet found for this student.");
      }

      const wDoc = wSnap.docs[0];
      const walletRef = doc(db, "studentWallets", wDoc.id);
      const walletData = wDoc.data();

      if (walletData.status === "frozen") {
        throw new Error("WALLET_FROZEN: This student wallet is currently frozen by school or parent.");
      }

      // Check category restrictions
      if (walletData.disabledCategories && Array.isArray(walletData.disabledCategories)) {
        if (walletData.disabledCategories.includes(serviceData.category)) {
          throw new Error(`CATEGORY_RESTRICTED: Spending in category '${serviceData.category}' is blocked for this student.`);
        }
      }

      // Check daily spending limit
      const currentDailySpent = Number(walletData.dailySpent) || 0;
      const dailyLimit = Number(walletData.dailyLimit) || 999999;
      if (dailyLimit > 0 && (currentDailySpent + cost) > dailyLimit) {
        throw new Error(`DAILY_LIMIT_EXCEEDED: Transaction exceeds daily spending limit of GHS ${dailyLimit.toFixed(2)}.`);
      }

      // STRICT BALANCE VERIFICATION
      const currentBal = Number(walletData.balance) || 0;
      if (currentBal < cost) {
        throw new Error(`INSUFFICIENT_BALANCE: Wallet balance (GHS ${currentBal.toFixed(2)}) is insufficient for this service (GHS ${cost.toFixed(2)}). Short by GHS ${(cost - currentBal).toFixed(2)}.`);
      }

      const previousBalance = currentBal;
      const newBalance = Number((previousBalance - cost).toFixed(2));
      const newDailySpent = Number((currentDailySpent + cost).toFixed(2));

      // 3. Atomically Deduct Balance
      txn.update(walletRef, {
        balance: newBalance,
        dailySpent: newDailySpent,
        lastUpdated: now
      });

      // 4. Create Immutable Transaction Record
      const txnRef = doc(collection(db, "walletTransactions"));
      const reference = `SRV-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      const txnRecord = {
        id: txnRef.id,
        walletId: walletData.walletId || `WAL-EDUK-${studentId}`,
        studentId,
        studentName: walletData.studentName || "Student",
        schoolId,
        type: "daily_service_charge",
        amount: cost,
        previousBalance,
        newBalance,
        description: `Daily Service Payment: ${serviceData.name}`,
        category: serviceData.category || "Campus Services",
        serviceId,
        serviceName: serviceData.name,
        paymentMethod: "wallet_deduction",
        reference,
        date: now,
        processedBy: processedBy || "Student Wallet Service Terminal",
        status: "successful"
      };
      txn.set(txnRef, txnRecord);

      // 5. Record Daily Service Usage Log
      const usageRef = doc(collection(db, "dailyServiceUsage"));
      txn.set(usageRef, {
        id: usageRef.id,
        schoolId,
        studentId,
        studentName: walletData.studentName || "Student",
        className: walletData.className || "",
        serviceId,
        serviceName: serviceData.name,
        category: serviceData.category,
        cost,
        date: now,
        transactionRef: reference,
        transactionId: txnRef.id,
        status: "completed"
      });

      // 6. Audit Log
      const auditRef = doc(collection(db, "auditLogs"));
      txn.set(auditRef, {
        logId: auditRef.id,
        action: "SERVICE_WALLET_DEDUCTION",
        schoolId,
        actorId: studentId,
        details: `Deducted GHS ${cost.toFixed(2)} for ${serviceData.name}. Previous: GHS ${previousBalance.toFixed(2)}, New: GHS ${newBalance.toFixed(2)}. Ref: ${reference}`,
        timestamp: now
      });

      return {
        newBalance,
        previousBalance,
        amount: cost,
        serviceName: serviceData.name,
        reference,
        transactionId: txnRef.id
      };
    });

    return res.json({
      success: true,
      ...result,
      message: `Service '${result.serviceName}' purchased successfully!`
    });
  } catch (err: any) {
    console.error("[WALLET PURCHASE ERROR]", err);
    return res.status(400).json({
      success: false,
      error: "PURCHASE_FAILED",
      message: err?.message || "Failed to process service purchase"
    });
  }
});

/**
 * Endpoint: POST /api/wallet/refund
 * Authoritative admin refund or balance adjustment. Reverses an earlier deduction.
 */
app.post("/api/wallet/refund", async (req, res) => {
  const { schoolId, transactionId, reason, authorizedBy } = req.body;

  if (!schoolId || !transactionId || !reason || !authorizedBy) {
    return res.status(400).json({ success: false, error: "MISSING_FIELDS", message: "schoolId, transactionId, reason, and authorizedBy are required" });
  }

  const now = new Date().toISOString();

  try {
    const db = getServerFirestore();
    const result = await runTransaction(db, async (txn) => {
      const origTxnRef = doc(db, "walletTransactions", transactionId);
      const origSnap = await txn.get(origTxnRef);
      if (!origSnap.exists()) {
        throw new Error("TRANSACTION_NOT_FOUND: Original transaction does not exist.");
      }

      const origData = origSnap.data();
      if (origData.schoolId !== schoolId) {
        throw new Error("CROSS_TENANT_VIOLATION: Transaction does not belong to school.");
      }

      if (origData.refunded) {
        throw new Error("ALREADY_REFUNDED: This transaction has already been refunded.");
      }

      if (origData.type === "topup" || origData.type === "refund") {
        throw new Error("INVALID_REFUND_TARGET: Only debit and service charges can be refunded.");
      }

      const refundAmount = Number(origData.amount);
      if (refundAmount <= 0) {
        throw new Error("INVALID_REFUND_AMOUNT: Original transaction amount is zero or negative.");
      }

      // Fetch student wallet
      const walletsCol = collection(db, "studentWallets");
      const wQuery = query(walletsCol, where("schoolId", "==", schoolId), where("studentId", "==", origData.studentId));
      const wSnap = await getDocs(wQuery);

      if (wSnap.empty) {
        throw new Error("WALLET_NOT_FOUND: Student wallet could not be found for refund.");
      }

      const wDoc = wSnap.docs[0];
      const walletRef = doc(db, "studentWallets", wDoc.id);
      const walletData = wDoc.data();

      const prevBal = Number(walletData.balance) || 0;
      const newBal = Number((prevBal + refundAmount).toFixed(2));

      // Mark original transaction as refunded
      const refundRefCode = `REF-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      txn.update(origTxnRef, {
        refunded: true,
        refundTransactionRef: refundRefCode,
        refundedAt: now
      });

      // Restore wallet balance
      txn.update(walletRef, {
        balance: newBal,
        lastUpdated: now
      });

      // Create new refund transaction record
      const refundTxnRef = doc(collection(db, "walletTransactions"));
      txn.set(refundTxnRef, {
        id: refundTxnRef.id,
        walletId: walletData.walletId,
        studentId: origData.studentId,
        studentName: origData.studentName,
        schoolId,
        type: "refund",
        amount: refundAmount,
        previousBalance: prevBal,
        newBalance: newBal,
        description: `Authorized Refund: ${reason} (Original Ref: ${origData.reference})`,
        category: "Refund",
        serviceId: origData.serviceId || "",
        serviceName: origData.serviceName || "",
        paymentMethod: "wallet_deduction",
        reference: refundRefCode,
        date: now,
        processedBy: authorizedBy,
        status: "successful"
      });

      // Audit Log
      const auditRef = doc(collection(db, "auditLogs"));
      txn.set(auditRef, {
        logId: auditRef.id,
        action: "WALLET_REFUND_AUTHORIZED",
        schoolId,
        actorId: authorizedBy,
        details: `Issued refund of GHS ${refundAmount.toFixed(2)} to ${origData.studentName} for transaction ${origData.reference}. Reason: ${reason}. New Balance: GHS ${newBal.toFixed(2)}`,
        timestamp: now
      });

      return { newBalance: newBal, refundAmount, reference: refundRefCode };
    });

    return res.json({
      success: true,
      newBalance: result.newBalance,
      refundAmount: result.refundAmount,
      reference: result.reference,
      message: `Refund of GHS ${result.refundAmount.toFixed(2)} processed successfully.`
    });
  } catch (err: any) {
    console.error("[WALLET REFUND ERROR]", err);
    return res.status(400).json({
      success: false,
      error: "REFUND_FAILED",
      message: err?.message || "Failed to process refund."
    });
  }
});

/**
 * Endpoint: GET /api/wallet/stats
 * Real-time school aggregated metrics: Total Balances, Total Funded, Total Spent, Service Revenue.
 */
app.get("/api/wallet/stats", async (req, res) => {
  const schoolId = String(req.query.schoolId || "").trim();
  if (!schoolId) {
    return res.status(400).json({ success: false, error: "Missing schoolId query parameter" });
  }

  try {
    const db = getServerFirestore();

    // Query wallets
    const walletsSnap = await getDocs(query(collection(db, "studentWallets"), where("schoolId", "==", schoolId)));
    let totalWallets = 0;
    let totalStoredBalance = 0;

    walletsSnap.forEach((d) => {
      totalWallets += 1;
      totalStoredBalance += Number(d.data().balance || 0);
    });

    // Query transactions
    const txnsSnap = await getDocs(query(collection(db, "walletTransactions"), where("schoolId", "==", schoolId)));
    let totalFunded = 0;
    let totalSpent = 0;
    let todaySpent = 0;
    let todayFunded = 0;
    const todayStr = new Date().toISOString().slice(0, 10);
    const categoryRevenue: Record<string, number> = {};

    txnsSnap.forEach((d) => {
      const data = d.data();
      const amt = Number(data.amount) || 0;
      const isToday = data.date && String(data.date).startsWith(todayStr);

      if (data.type === "topup" && data.status === "successful") {
        totalFunded += amt;
        if (isToday) todayFunded += amt;
      } else if (data.status === "successful" && data.type !== "refund") {
        totalSpent += amt;
        if (isToday) todaySpent += amt;
        const cat = data.category || "General";
        categoryRevenue[cat] = (categoryRevenue[cat] || 0) + amt;
      }
    });

    // Query active services
    const servicesSnap = await getDocs(query(collection(db, "dailyServices"), where("schoolId", "==", schoolId)));
    let activeServicesCount = 0;
    servicesSnap.forEach((d) => {
      if (d.data().status === "active") activeServicesCount += 1;
    });

    // Query daily service usages
    const usagesSnap = await getDocs(query(collection(db, "dailyServiceUsage"), where("schoolId", "==", schoolId)));
    let todayUsageCount = 0;
    usagesSnap.forEach((d) => {
      const data = d.data();
      if (data.date && String(data.date).startsWith(todayStr)) {
        todayUsageCount += 1;
      }
    });

    return res.json({
      success: true,
      schoolId,
      totalWallets,
      totalStoredBalance: Number(totalStoredBalance.toFixed(2)),
      totalFunded: Number(totalFunded.toFixed(2)),
      totalSpent: Number(totalSpent.toFixed(2)),
      todayFunded: Number(todayFunded.toFixed(2)),
      todaySpent: Number(todaySpent.toFixed(2)),
      activeServicesCount,
      todayUsageCount,
      totalUsageCount: usagesSnap.size,
      categoryRevenue,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error("[WALLET STATS ERROR]", err);
    return res.status(500).json({ success: false, error: err?.message || "Failed to calculate wallet metrics" });
  }
});

// -------------------------------------------------------------
// VITE MIDDLEWARE SETUP (DEV VS PROD)
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[EDUkenZA AI Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
