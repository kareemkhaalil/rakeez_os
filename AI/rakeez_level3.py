import streamlit as st
import requests
import json
import subprocess
import os
import trimesh
import plotly.graph_objects as go
import numpy as np
from datetime import datetime

# ==========================================
# CONFIGURATION & CONSTANTS
# ==========================================
OPENSCAD_PATH = r"C:\Program Files\OpenSCAD\openscad.exe"
STL_OUTPUT = "output_model.stl"
SCAD_TEMP = "temp_model.scad"
LLM_API_URL = "http://127.0.0.1:1234/v1/chat/completions"

# ==========================================
# MODULE 1: AI PARAMETER EXTRACTOR
# ==========================================
class AIParameterExtractor:
    """
    NLP to JSON engine for parametric CAD design.
    """
    def __init__(self, api_url=LLM_API_URL):
        self.api_url = api_url

    def extract(self, prompt):
        system_prompt = """
        You are an advanced CAD engineer for RAKEEZ OS.
        Extract engineering parameters for 3D modelling.
        Output ONLY valid JSON.
        Schema: {"shape": "turbine" | "gear", "radius": float, "height": float, "blades_or_teeth": int, "twist_angle": float}
        - If shape is gear, set twist_angle to 0.
        - If parameters are missing, use defaults: radius=20.0, height=10.0, blades_or_teeth=8, twist_angle=45.0.
        """
        try:
            response = requests.post(
                self.api_url,
                json={
                    "model": "local-model",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.1
                },
                timeout=120 # High latency tolerance for complex reasoning
            )
            content = response.json()['choices'][0]['message']['content']
            # Clean possible markdown blocks
            content = content.replace("```json", "").replace("```", "").strip()
            return json.loads(content)
        except Exception as e:
            st.error(f"AI Subsystem Failure: {e}")
            return None

# ==========================================
# MODULE 2: OPENSCAD SCRIPT GENERATOR
# ==========================================
class OpenSCADGenerator:
    """
    Deterministic generation of OpenSCAD code.
    """
    @staticmethod
    def generate_gear(params):
        r = params.get('radius', 20)
        h = params.get('height', 10)
        teeth = int(params.get('blades_or_teeth', 8))
        tooth_size = (2 * 3.14159 * r) / (teeth * 2)
        
        scad = f"""
// RAKEEZ OS - PARAMETRIC GEAR
$fn = 100;

module gear_profile() {{
    union() {{
        circle(r = {r});
        for(i = [0 : {teeth-1}]) {{
            rotate(i * 360 / {teeth})
            translate([{r}, 0, 0])
            square([{tooth_size}, {tooth_size}], center=true);
        }}
    }}
}}

linear_extrude(height = {h}, center = true)
gear_profile();
"""
        return scad

    @staticmethod
    def generate_turbine(params):
        r = params.get('radius', 20)
        h = params.get('height', 50)
        blades = int(params.get('blades_or_teeth', 12))
        twist = params.get('twist_angle', 90)
        
        scad = f"""
// RAKEEZ OS - PARAMETRIC TURBINE
$fn = 60;

module blade() {{
    translate([{r/2}, 0, 0])
    square([{r}, 2], center=true);
}}

module turbine_profile() {{
    union() {{
        circle(r = {r/4}); // Central hub
        for(i = [0 : {blades-1}]) {{
            rotate(i * 360 / {blades})
            blade();
        }}
    }}
}}

linear_extrude(height = {h}, twist = {twist}, slices = 100, center = true)
turbine_profile();
"""
        return scad

# ==========================================
# MODULE 3: SOLID AUTO-COMPILER (SUBPROCESS)
# ==========================================
class SolidCompiler:
    """
    Subprocess bridge to OpenSCAD CLI.
    """
    def __init__(self, openscad_path=OPEN_SCAD_PATH if 'OPEN_SCAD_PATH' in locals() else OPENSCAD_PATH):
        self.path = openscad_path

    def compile(self, scad_code):
        # Save SCAD file
        with open(SCAD_TEMP, "w") as f:
            f.write(scad_code)
        
        # Verify OpenSCAD exists
        if not os.path.exists(self.path):
            st.error(f"OpenSCAD not found at: {self.path}")
            return False
            
        try:
            # Run compilation command
            result = subprocess.run(
                [self.path, "-o", STL_OUTPUT, SCAD_TEMP],
                capture_output=True,
                text=True,
                check=True
            )
            return True
        except subprocess.CalledProcessError as e:
            st.error(f"Compilation Failed: {e.stderr}")
            return False
        except Exception as e:
            st.error(f"System Error during compilation: {e}")
            return False

# ==========================================
# MODULE 4: DIGITAL TWIN 3D VIEWER
# ==========================================
def render_stl_plotly(stl_file):
    """
    Renders an STL file using Trimesh and Plotly.
    """
    try:
        mesh = trimesh.load(stl_file)
        
        # Extract vertices and faces
        vertices = mesh.vertices
        faces = mesh.faces
        
        # Plotly Mesh3d
        fig = go.Figure(data=[
            go.Mesh3d(
                x=vertices[:, 0],
                y=vertices[:, 1],
                z=vertices[:, 2],
                i=faces[:, 0],
                j=faces[:, 1],
                k=faces[:, 2],
                color='lightgrey',
                opacity=0.9,
                flatshading=True,
                name="RAKEEZ OS Model"
            )
        ])
        
        fig.update_layout(
            template="plotly_dark",
            scene=dict(
                xaxis=dict(visible=False),
                yaxis=dict(visible=False),
                zaxis=dict(visible=False),
                aspectmode='data'
            ),
            margin=dict(l=0, r=0, b=0, t=0),
            height=600
        )
        return fig
    except Exception as e:
        st.error(f"Rendering Error: {e}")
        return None

# ==========================================
# STREAMLIT UI: INDUSTRIAL BRUTALISM
# ==========================================
def main():
    st.set_page_config(page_title="RAKEEZ LEVEL 3 - PARAMETRIC ENGINE", layout="wide")
    
    # Custom CSS for Deep Tech / Industrial Aesthetic
    st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'JetBrains Mono', monospace;
        background-color: #050505;
        color: #00FF41; /* CRT Green */
    }
    .stTextInput>div>div>input {
        background-color: #111;
        color: #00FF41;
        border: 1px solid #333;
    }
    .stButton>button {
        width: 100%;
        background-color: #222;
        color: #FF4B4B;
        border: 1px solid #FF4B4B;
        font-weight: bold;
        height: 3em;
        transition: 0.3s;
    }
    .stButton>button:hover {
        background-color: #FF4B4B;
        color: white;
    }
    .stCodeBlock {
        border-right: 5px solid #00FF41;
        background-color: #0a0a0a !important;
    }
    h1, h2, h3 { color: white !important; text_transform: uppercase; letter_spacing: 2px; }
    </style>
    """, unsafe_allow_html=True)

    st.title("🛡️ RAKEEZ OS | LEVEL 3")
    st.subheader("PARAMETRIC CAD GENERATION ENGINE (AI-to-SOLID)")

    with st.sidebar:
        st.image("https://img.icons8.com/wired/128/ffffff/module.png", width=60)
        st.markdown("### SYSTEM OVERVIEW")
        st.code("""
PLATFORM: EDGE-AI
KERNEL: SOLID_HW_V3
MODE: PARAMETRIC_EXTRUDE
        """, language="bash")
        
        st.markdown("---")
        st.info("Compiler: OpenSCAD Ready")
        st.success("Solid Kernel: ACTIVE")

    col1, col2 = st.columns([1, 1])

    with col1:
        st.markdown("### 🧬 NLP MISSION PARAMETERS")
        user_prompt = st.text_input("INPUT NATURAL LANGUAGE SPECIFICATIONS:", 
                                   placeholder="e.g. Design a gear with radius 35, 20 teeth, and 5mm height",
                                   key="prompt_input")
        
        generate_btn = st.button("SYNTHESIZE SOLID GEOMETRY")
        
        if generate_btn and user_prompt:
            extractor = AIParameterExtractor()
            with st.spinner("Decoding engineering intent (LLM Analysis)..."):
                params = extractor.extract(user_prompt)
            
            if params:
                st.session_state['l3_params'] = params
                
                # Generate SCAD
                gen = OpenSCADGenerator()
                if params['shape'] == 'gear':
                    scad_code = gen.generate_gear(params)
                else:
                    scad_code = gen.generate_turbine(params)
                
                st.session_state['l3_scad'] = scad_code
                
                # Compile to STL
                compiler = SolidCompiler()
                with st.spinner(f"Compiling Solid Model via OpenSCAD Subprocess..."):
                    success = compiler.compile(scad_code)
                    if success:
                        st.success("✅ Model successfully compiled. Ready for Safe CAM Slicing.")
                        st.session_state['l3_stl_ready'] = True
                    else:
                        st.session_state['l3_stl_ready'] = False

    if 'l3_params' in st.session_state:
        with col1:
            st.markdown("### 📦 EXTRACTED GEOMETRY")
            st.json(st.session_state['l3_params'])
            
            st.markdown("### 📜 GENERATED OPENSCAD KERNEL")
            st.code(st.session_state['l3_scad'], language="openscad")

        with col2:
            st.markdown("### 🖥️ DIGITAL TWIN (3D SOLID VIEW)")
            if st.session_state.get('l3_stl_ready'):
                fig = render_stl_plotly(STL_OUTPUT)
                if fig:
                    st.plotly_chart(fig, use_container_width=True)
            else:
                st.warning("Awaiting compiler output...")
                
            # Add a download link for the STL
            if os.path.exists(STL_OUTPUT):
                with open(STL_OUTPUT, "rb") as f:
                    st.download_button(
                        label="⬇️ DOWNLOAD STL FOR HARDWARE",
                        data=f,
                        file_name="rakeez_model.stl",
                        mime="application/sla"
                    )

if __name__ == "__main__":
    main()
