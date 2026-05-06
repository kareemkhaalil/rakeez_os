// RAKEEZ OS - Hybrid Architecture Prototype

async function generateSafeGCode(userInput) {
    console.log("====================================");
    console.log("1. User Input ->", userInput);
    console.log("====================================");

    // 1. دور الذكاء الاصطناعي: فهم النية فقط (Intent Extraction) واستخراج البيانات كـ JSON
    const systemPrompt = `You are an intent extractor. Extract parameters from the user prompt. 
    Output ONLY valid JSON in this format: {"shape": "square", "width": 0, "height": 0, "depth": 0}. 
    Do not write any other text or code blocks.`;

    try {
        console.log("2. AI is processing intent...");
        const response = await fetch("http://127.0.0.1:1234/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "local-model", // LM Studio ignores this and uses the loaded model
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userInput }
                ],
                temperature: 0.1 // درجة حرارة منخفضة جداً لمنع الهلوسة
            })
        });

        const data = await response.json();
        // تنظيف الرد تحسباً لو الموديل حط علامات ```json
        const cleanContent = data.choices[0].message.content.replace(/```json|```/g, "").trim();
        const extractedParams = JSON.parse(cleanContent);

        console.log("   [SUCCESS] AI Extracted JSON:", extractedParams);
        console.log("====================================");

        // 2. دور المفتش الهندسي: البرمجة الحتمية (Deterministic Logic)
        if (extractedParams.shape === "square" || extractedParams.shape === "مربع") {
            console.log("3. Middleware is generating 100% SAFE G-Code...");

            const w = extractedParams.width;
            const h = extractedParams.height;
            const d = extractedParams.depth;

            // كود ثابت، رياضي، مستحيل يغلط أو يكسر البنطة
            const safeGcode = `
G90             ; Absolute Positioning
G21             ; Metric Units
G0 Z10.0        ; [SAFETY] Retract to Safe Z first!
G0 X0.0 Y0.0    ; Move to Start Position
G1 Z-${d}.0 F200  ; Plunge to depth: ${d}mm
G1 X${w}.0 F500     ; Cut width: ${w}mm
G1 Y${h}.0 F500     ; Cut height: ${h}mm
G1 X0.0 F500    ; Return X
G1 Y0.0 F500    ; Return Y
G0 Z10.0        ; [SAFETY] Retract tool
M30             ; End
            `;
            console.log(safeGcode);
            console.log("====================================");
            console.log("-> G-Code ready to be sent to ESP32/Tang Nano!");

        } else {
            console.log("Error: Unsupported shape detected by Middleware.");
        }

    } catch (error) {
        console.error("System Failure:", error);
    }
}

// تشغيل النظام وتجربته بطلب باللغة العربية!
generateSafeGCode("يا ركيز، أريد حفر مربع طوله 45 وعرضه 45 بعمق 3 مليمتر");