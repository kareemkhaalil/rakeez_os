# RAKEEZ Cognitive Engine - Ollama Local Integration

### 1. Connection Protocol:
- Always connect to Ollama REST API via standard fetch requests to the local port.
- Endpoint: `POST http://localhost:11434/api/generate`

### 2. Multi-Modal Models:
- **Text/Specs:** Use `llama3` or `mistral`.
- **Images/Blueprints:** Use `llava` (Vision model). The image must be converted to Base64 before sending.

### 3. The System Prompt (Crucial):
The AI must act as a strict CNC Data Extractor.
Output Format MUST be a Parseable JSON string:
{
  "operation": "POCKET" | "PROFILE",
  "shape": "RECTANGLE" | "CIRCLE" | "COMPLEX",
  "dimensions": { "x": number, "y": number, "radius": number },
  "depth": number,
  "toolDiameter": number,
  "material": "WOOD" | "ALUMINUM",
  "confidence": number (0-100)
}