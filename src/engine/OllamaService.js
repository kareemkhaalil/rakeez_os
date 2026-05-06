/**
 * RAKEEZ Cognitive AI Service
 * Supports Custom LM Studio / LocalAI formats (Gemma/v1/chat).
 */
export const OllamaService = {
  ENDPOINT: 'http://127.0.0.1:1234/v1/chat/completions',
  TIMEOUT_MS: 60000, 

  /**
   * Parse machining intent using the specific format requested by the user.
   */
  async parseTextCommand(text) {
    const systemPrompt = `
You are RAKEEZ, a deterministic industrial CNC data extraction engine.
You DO NOT converse. You DO NOT explain. You output ONLY raw, valid JSON.

Extract machining parameters from the user's input based on this EXACT schema:
{
  "operation": "PROFILE" | "POCKET" | "FACE" | "BORE" | "ON",
  "shape": "RECTANGLE" | "CIRCLE" | "STAR" | "POLYGON" | "SPUR_GEAR" | "TURBINE",
  "dimensions": { "w": number, "h": number, "radius": number, "diameter": number },
  "parameters": { "teeth": number, "pitch_angle": number, "sides": number, "blades": number },
  "depth": number,
  "tool_diameter": number
}

Industrial Rules:
1. "Pocket", "تفريغ", "Clear", "حفر" -> "operation": "POCKET"
2. "Face", "Surface", "تسطيح", "امسح", "مسح", "تصفية", "وش", "قشط" -> "operation": "FACE"
3. "Bore", "Hole", "Drill", "ثقب" -> "operation": "BORE" and set shape to "CIRCLE"
4. "Gear", "ترس" -> "shape": "SPUR_GEAR", set "parameters.teeth"
5. "Turbine", "Fan", "مروحة" -> "shape": "TURBINE", set "parameters.blades"
6. "Radius" is ALWAYS half of the diameter.
7. If tool_diameter is missing, return 6.0.
8. If depth is missing, return 5.0.
9. For "Pocket Circle": set operation=POCKET, shape=CIRCLE, provide radius/diameter.
10. For "Face Rectangle", "Board", "لوح", "مربع": set operation=FACE, shape=RECTANGLE, provide w/h.

Example: "امسح سطح لوح خشب 200x200 مم"
Output: {"operation": "FACE", "shape": "RECTANGLE", "dimensions": {"w": 200, "h": 200, "radius": 100, "diameter": 200}, "parameters": {}, "depth": 5.0, "tool_diameter": 6.0}
`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      console.log(`[AI CHANNEL] Dispatching request to ${this.ENDPOINT}...`);
      const response = await fetch(this.ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ],
          temperature: 0.1
        }),
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI Node Error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      
      let content = '';
      if (data.output && Array.isArray(data.output)) {
        content = data.output
          .filter(o => o.type === 'message' || o.type === 'reasoning' || !o.type)
          .map(o => o.content)
          .join('\n');
      } else {
        content = data.text || data.content || data.output || (data.choices && data.choices[0].message.content) || '';
      }
      
      if (!content) throw new Error('AI response contains no usable content stream.');

      // DEFENSIVE JSON EXTRACTION & SANITIZATION
      // 1. Remove Markdown code blocks if present
      let cleanedContent = content.replace(/```json\s?|```/g, '');
      
      const jsonMatches = cleanedContent.match(/\{[\s\S]*\}/g);
      if (!jsonMatches) {
        console.error('[AI RAW CONTENT]', content);
        throw new Error('AI output did not contain a valid JSON block.');
      }
      
      let jsonStr = jsonMatches[jsonMatches.length - 1];

      // 2. Remove comments and trailing commas
      jsonStr = jsonStr.replace(/\/\/.*$/gm, '');
      jsonStr = jsonStr.replace(/,\s*([\]}])/g, '$1');
      jsonStr = jsonStr.replace(/'/g, '"');

      return JSON.parse(jsonStr);

    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new Error(`AI Hallucination: Malformed JSON structure. Please retry.`);
      }
      if (err.name === 'AbortError') {
        throw new Error('AI Node Timeout (120s). Hardware taking too long to reason.');
      }
      throw err;
    }
  }
};
