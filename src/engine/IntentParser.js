export const IntentParser = {
  parse: (text) => {
    const errors = [];
    // Pre-clean: Remove surrounding quotes and punctuation
    let normalizedText = text.toLowerCase().trim().replace(/^["']+|["']+$/g, '');

    if (!normalizedText || normalizedText.length < 3) {
      return { success: false, intent: null, errors: ['Input too short.'] };
    }

    // ─── 1. Detect Operation ───
    let operation = 'PROFILE'; 
    if (/pocket|تفريغ|حفر|جوره|توسيع|clear|hollow|inside|داخلي/.test(normalizedText)) {
      operation = 'POCKET';
    } else if (/face|surface|امسح|مسح|تصفية|تسطيح|وش|قشط/.test(normalizedText)) {
      operation = 'FACE';
    } else if (/profile|contour|outline|cut out|قص|نحت|محيط|خارجي|outside|perimeter/.test(normalizedText)) {
      operation = 'PROFILE';
    } else if (/engrave|نحيت|رسم|mark/.test(normalizedText)) {
      operation = 'ON';
    }

    // ─── 2. Detect Shape ───
    let shape = 'CIRCLE';
    if (/square|rectangle|مربع|مستطيل|rect|لوح|سطح|خشب|board/.test(normalizedText)) {
      shape = 'RECTANGLE';
    } else if (/gear|ترس|مسنن|سنات/.test(normalizedText)) {
      shape = 'SPUR_GEAR';
    } else if (/turbine|fan|propeller|مروحة|توربينة|ريشة/.test(normalizedText)) {
      shape = 'TURBINE';
    } else if (/circle|دوار|دائرة|اسطوانة|round/.test(normalizedText)) {
      shape = 'CIRCLE';
    } else if (/star|نجمة/.test(normalizedText)) {
      shape = 'STAR';
    }

    // ─── 3. Extract Parameters ───
    let params = {
      diameter: 0,
      width: 0,
      height: 0,
      teeth: 0,
      pitch_angle: 20, 
      depth: 5,
      tool_diameter: 6
    };

    // Helper: Soft Anchor Regex Builder
    // Matches Arabic roots ignoring prefixes (الـ, و) and suffixes (ـه, ـة, ـات, ـين)
    // Supports both "Root 20" and "20 Root"
    const extractNumeric = (keywords, text) => {
      // Look for a number immediately preceding or succeeding the keyword
      // e.g., "120 سنة", "سنة 120", "بقطر 300", "عمق 15"
      const regex = new RegExp(`(?:${keywords})[^\\s\\d]*\\s*(\\d+(?:\\.\\d+)?)|(\\d+(?:\\.\\d+)?)\\s*(?:${keywords})`, 'i');
      const match = text.match(regex);
      if (match) return parseFloat(match[1] || match[2]);
      return null;
    };

    // Teeth extraction
    const teeth = extractNumeric('teeth|tooth|سن|اسنان', normalizedText);
    if (teeth) {
      params.teeth = Math.round(teeth);
      if (shape === 'CIRCLE') shape = 'SPUR_GEAR';
    }

    // Diameter
    const dia = extractNumeric('diameter|dia|قطر|radius', normalizedText);
    if (dia) {
      const isRadius = /radius|نصف/.test(normalizedText);
      params.diameter = isRadius ? dia * 2 : dia;
      params.width = params.diameter;
      params.height = params.diameter;
    }

    // Width x Height (e.g. 200 x 200 or 200 في 200)
    const dimMatch = normalizedText.match(/(\d+(?:\.\d+)?)\s*(?:x|×|في)\s*(\d+(?:\.\d+)?)/i);
    if (dimMatch) {
      params.width = parseFloat(dimMatch[1]);
      params.height = parseFloat(dimMatch[2]);
      if (params.diameter === 0) params.diameter = Math.max(params.width, params.height);
    } else {
        const width = extractNumeric('طول|عرض', normalizedText);
        if (width) {
            params.width = width;
            params.height = width; // Default to square if only one dimension given
             if (params.diameter === 0) params.diameter = width;
        }
    }

    // Depth
    const depth = extractNumeric('depth|thickness|عمق|سمك|تخن|انزل', normalizedText);
    if (depth) {
      params.depth = depth;
    }

    // Tool Diameter
    const tool = extractNumeric('tool|bit|endmill|بنط|ريش', normalizedText);
    if (tool) {
      params.tool_diameter = tool;
    }

    // ─── 4. Fallback defaults ───
    if (params.diameter === 0 && params.width === 0) {
      const fallbackMatch = normalizedText.match(/(\d+(?:\.\d+)?)\s*(?:mm|ملم|ملي)/i);
      if (fallbackMatch) {
        params.diameter = parseFloat(fallbackMatch[1]);
        params.width = params.diameter;
        params.height = params.diameter;
      }
    }

    if (params.diameter === 0 && params.width === 0 && shape !== 'TURBINE') {
      errors.push('Could not detect dimensions (مطلوب تحديد المقاسات)');
    }
    
    if (shape === 'SPUR_GEAR' && params.teeth === 0) {
        params.teeth = 12;
    }

    if (errors.length > 0) return { success: false, intent: null, errors };

    return {
      success: true,
      intent: {
        operation,
        shape,
        dimensions: {
          w: params.width || params.diameter,
          h: params.height || params.diameter,
          radius: (params.diameter || params.width) / 2,
          diameter: params.diameter || params.width
        },
        parameters: {
          teeth: params.teeth,
          pitch_angle: params.pitch_angle
        },
        tool_diameter: params.tool_diameter,
        depth: params.depth,
        feedRate: 1500,
        rpm: 18000
      }
    };
  }
};
