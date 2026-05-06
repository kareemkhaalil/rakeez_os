import logging
import time
import threading
import json
from typing import Dict
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ==========================================
# CONFIGURATION & LOGGING
# ==========================================
LOG_FORMAT = "%(asctime)s [%(levelname)s] %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)
logger = logging.getLogger("RAKEEZ_SERIAL_SERVER")

app = FastAPI(title="RAKEEZ OS V3 Serial Bridge")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# MACHINE STATE & SERIAL ENGINE
# ==========================================
class MachineState:
    def __init__(self):
        self.status = "IDLE" 
        self.x, self.y, self.z, self.a = 0.0, 0.0, 0.0, 0.0
        self.is_streaming = False
        self.current_line = 0
        self.total_lines = 0
        self.gcode_buffer = []
        self.stop_requested = False
        self.paused = False

state = MachineState()

def serial_worker():
    global state
    while True:
        if state.is_streaming and not state.paused:
            if state.current_line < state.total_lines:
                line = state.gcode_buffer[state.current_line]
                
                # Mock Coordinate Update (Regex for speed)
                import re
                for axis in ['X', 'Y', 'Z', 'A']:
                    match = re.search(rf"{axis}([-+]?[0-9]*\.?[0-9]+)", line.upper())
                    if match: setattr(state, axis.lower(), float(match.group(1)))

                time.sleep(0.01) # High-speed simulation
                state.current_line += 1
                if state.current_line >= state.total_lines:
                    state.is_streaming = False
                    state.status = "IDLE"
            else:
                state.is_streaming = False
                state.status = "IDLE"
        
        if state.stop_requested:
            state.is_streaming = False
            state.stop_requested = False
            state.status = "IDLE"
            
        time.sleep(0.005)

threading.Thread(target=serial_worker, daemon=True).start()

# ==========================================
# ENDPOINTS
# ==========================================

@app.get("/api/status")
async def get_status():
    return {
        "status": state.status,
        "coords": {"x": state.x, "y": state.y, "z": state.z, "a": state.a},
        "progress": (state.current_line / state.total_lines * 100) if state.total_lines > 0 else 0,
        "is_streaming": state.is_streaming
    }

@app.post("/api/control/stream")
async def control_stream(data: Dict):
    global state
    gcode = data.get('gcode', '')
    if not gcode:
        raise HTTPException(status_code=400, detail="No G-code provided")
    
    state.gcode_buffer = gcode.splitlines()
    state.total_lines = len(state.gcode_buffer)
    state.current_line = 0
    state.is_streaming = True
    state.status = "RUNNING"
    state.paused = False
    logger.info(f"V3 Stream Initialized: {state.total_lines} lines.")
    return {"status": "success"}

@app.post("/api/control/pause")
async def control_pause():
    state.paused = True
    state.status = "PAUSED"
    return {"status": "success"}

@app.post("/api/control/resume")
async def control_resume():
    state.paused = False
    state.status = "RUNNING"
    return {"status": "success"}

@app.post("/api/control/stop")
async def control_stop():
    state.stop_requested = True
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("serial_server:app", host="0.0.0.0", port=8000)
