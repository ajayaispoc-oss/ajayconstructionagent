
import streamlit as st
import os
import json
import google.generativeai as genai
from datetime import datetime
import pandas as pd

# --- CONFIGURATION ---
st.set_page_config(
    page_title="Ajay Constructions - Hyderabad Agent Portal",
    page_icon="🏗️",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# API Setup
if "API_KEY" in os.environ:
    genai.configure(api_key=os.environ["API_KEY"])
else:
    st.error("API_KEY environment variable not found.")

# --- CUSTOM STYLING ---
st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
    
    html, body, [class*="st-"] {
        font-family: 'Inter', sans-serif;
    }
    
    .main {
        background-color: #F9FBFF;
    }
    
    /* Header Styling */
    .header-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 2rem 0;
        border-bottom: 1px solid #E2E8F0;
        margin-bottom: 3rem;
    }
    
    .brand-title {
        color: #1E3A8A;
        font-weight: 900;
        font-size: 2.5rem;
        text-transform: uppercase;
        letter-spacing: -2px;
        line-height: 1;
    }
    
    /* Marquee Ticker */
    .ticker-wrap {
        width: 100%;
        overflow: hidden;
        background-color: #1E3A8A;
        padding: 10px 0;
        margin-bottom: 20px;
    }
    
    .ticker {
        display: inline-block;
        white-space: nowrap;
        padding-right: 100%;
        animation: marquee 30s linear infinite;
        color: rgba(255,255,255,0.7);
        font-size: 0.75rem;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 2px;
    }
    
    @keyframes marquee {
        0% { transform: translate(0, 0); }
        100% { transform: translate(-100%, 0); }
    }

    /* Cards */
    .construction-card {
        background: white;
        padding: 2.5rem;
        border-radius: 2.5rem;
        border: 1px solid #F1F5F9;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
    }
    
    .invoice-container {
        background: white;
        padding: 4rem;
        border-radius: 4rem;
        border: 1px solid #F1F5F9;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        max-width: 900px;
        margin: 0 auto;
    }

    .upi-scanner {
        background: #F8FAFC;
        padding: 20px;
        border-radius: 2rem;
        text-align: center;
        border: 1px solid #E2E8F0;
    }

    /* Buttons */
    .stButton>button {
        border-radius: 1.5rem;
        padding: 1rem 2rem;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 1px;
        transition: all 0.2s;
    }
    </style>
""", unsafe_allow_html=True)

# --- APP STATE ---
if 'view' not in st.session_state:
    st.session_state.view = 'calculator'
if 'estimate' not in st.session_state:
    st.session_state.estimate = None
if 'history' not in st.session_state:
    st.session_state.history = []
if 'user_data' not in st.session_state:
    st.session_state.user_data = None

# --- CONSTANTS & DATA ---
UPI_ID = "ajay.t.me@icici"
BRAND_NAME = "Ajay Constructions"
CONTACT_PHONE = "9703133338"
CONTACT_EMAIL = "ajay.t.me@gmail.com"

TASKS = {
    "Whole Build": "🏗️",
    "Electrical System": "⚡",
    "Paint & Finishes": "🎨",
    "Flooring & Tiling": "📐",
    "Sanitary & Utility": "🚰",
    "Brickwork & Masonry": "🧱"
}

MARKET_TICKER = " | ".join([
    "UltraTech Cement: ₹415/bag",
    "Vizag TMT 12mm: ₹72,400/ton",
    "Finolex 2.5mm: ₹2,150/coil",
    "Asian Paints Royale: ₹590/Ltr",
    "M-Sand (Cubic Ft): ₹45"
])

# --- HELPER FUNCTIONS ---
def get_upi_qr(amount=None):
    base_url = f"upi://pay?pa={UPI_ID}&pn=Ajay%20Constructions&cu=INR"
    if amount: base_url += f"&am={amount}"
    return f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={base_url}"

def call_gemini_estimator(task, inputs):
    model = genai.GenerativeModel('gemini-3-pro-preview')
    prompt = f"""
    Act as a Senior Construction Estimator for the Hyderabad Real Estate Market (Jan 2026).
    Estimate for: {task}
    Inputs: {json.dumps(inputs)}
    
    Rules:
    - Return valid JSON only.
    - Include: materials (list of items with quantity, unitPrice, totalPrice, brandSuggestion),
      laborCost (number), estimatedDays (number), precautions (list), 
      totalEstimatedCost (number), expertTips (string), 
      paintCodeSuggestions (list of 5 codes if painting task).
    """
    try:
        response = model.generate_content(prompt)
        # Clean potential markdown from response
        clean_text = response.text.replace('```json', '').replace('```', '').strip()
        return json.loads(clean_text)
    except Exception as e:
        st.error(f"AI Estimation Error: {e}")
        return None

# --- UI COMPONENTS ---
def render_header():
    st.markdown(f"""
        <div class="ticker-wrap"><div class="ticker">{MARKET_TICKER} • {MARKET_TICKER}</div></div>
        <div class="header-container">
            <div>
                <div class="brand-title">{BRAND_NAME}</div>
                <div style="color: #64748B; font-weight: bold; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px;">
                    Hyderabad Agent Portal • 2026 Engineering Index
                </div>
            </div>
        </div>
    """, unsafe_allow_html=True)

def render_calculator():
    st.markdown("### 📊 Construction Intelligence")
    
    col1, col2 = st.columns([1, 2], gap="large")
    
    with col1:
        st.markdown('<div class="construction-card">', unsafe_allow_html=True)
        st.write("#### Project Configuration")
        with st.form("estimator_form"):
            client_name = st.text_input("Project / Client Name", placeholder="e.g., Gachibowli Flat 402")
            task = st.selectbox("Select Service", list(TASKS.keys()))
            area_loc = st.selectbox("Hyderabad Sub-Zone", ["Madhapur", "Gachibowli", "Kukatpally", "Jubilee Hills", "Banjara Hills", "Kondapur"])
            quality = st.select_slider("Finishing Grade", options=["Budget", "Standard", "Premium", "Luxury"])
            
            # Dynamic Fields
            specific_inputs = {}
            if task == "Paint & Finishes":
                specific_inputs['sqft'] = st.number_input("Wall Area (sq ft)", value=1000)
                specific_inputs['brand'] = st.selectbox("Brand", ["Asian Paints", "Birla Opus", "Berger"])
            elif task == "Whole Build":
                specific_inputs['type'] = st.radio("Category", ["Independent House", "Apartment Flat"])
                specific_inputs['sqft'] = st.number_input("Built-up Area (sq ft)", value=1500)
            
            submit = st.form_submit_button("Generate Professional Quote")
            
            if submit:
                with st.spinner("Analyzing Troop Bazaar Indices..."):
                    inputs = {
                        "client": client_name,
                        "location": area_loc,
                        "grade": quality,
                        **specific_inputs
                    }
                    result = call_gemini_estimator(task, inputs)
                    if result:
                        st.session_state.estimate = {**result, "client_name": client_name, "task": task, "location": area_loc}
                        st.session_state.history.append(st.session_state.estimate)
        st.markdown('</div>', unsafe_allow_html=True)

    with col2:
        if st.session_state.estimate:
            est = st.session_state.estimate
            st.markdown(f"""
                <div style="background: white; padding: 2.5rem; border-radius: 2.5rem; border: 1px solid #E2E8F0;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 2rem;">
                        <div>
                            <h2 style="margin:0; font-weight:900; color:#1E3A8A; text-transform:uppercase;">Quotation Analysis</h2>
                            <p style="color:#64748B; font-weight:bold; font-size:0.8rem;">{est['client_name']} • {est['location']}</p>
                        </div>
                        <div style="text-align: right;">
                            <p style="margin:0; font-size:0.7rem; font-weight:black; color:#1E3A8A; text-transform:uppercase;">Total Estimate</p>
                            <h1 style="margin:0; font-weight:900; color:#1E3A8A; font-size:3rem;">₹{est['totalEstimatedCost']:,}</h1>
                        </div>
                    </div>
            """, unsafe_allow_html=True)
            
            # Stats Grid
            c1, c2, c3 = st.columns(3)
            c1.metric("Labor", f"₹{est['laborCost']:,}")
            c2.metric("Duration", f"{est['estimatedDays']} Days")
            c3.metric("Grade", est.get('grade', 'Standard'))
            
            # Materials Table
            st.write("---")
            st.markdown("##### 📦 Bill of Materials")
            df = pd.DataFrame(est['materials'])
            st.table(df[['name', 'quantity', 'totalPrice', 'brandSuggestion']])
            
            # Actions
            st.write("---")
            act_col1, act_col2 = st.columns([2, 1])
            with act_col1:
                if st.button("📄 Generate Engineering Invoice"):
                    st.session_state.view = 'invoice'
                    st.rerun()
            
            with act_col2:
                st.markdown(f"""
                    <div class="upi-scanner">
                        <p style="font-size:0.6rem; font-weight:900; margin-bottom:10px; color:#1E3A8A;">SCAN TO PAY CONSULTATION</p>
                        <img src="{getUpiQr()}" width="100">
                        <p style="font-size:0.5rem; color:#94A3B8; margin-top:5px;">{UPI_ID}</p>
                    </div>
                """, unsafe_allow_html=True)

            # Contact Bar
            st.markdown(f"""
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <a href="https://wa.me/91{CONTACT_PHONE}" style="flex:1; background:#25D366; color:white; text-align:center; padding:15px; border-radius:1rem; font-weight:bold; text-decoration:none; font-size:0.8rem;">WHATSAPP</a>
                    <a href="tel:{CONTACT_PHONE}" style="flex:1; background:#1E3A8A; color:white; text-align:center; padding:15px; border-radius:1rem; font-weight:bold; text-decoration:none; font-size:0.8rem;">CALL AJAY</a>
                    <a href="mailto:{CONTACT_EMAIL}" style="flex:1; background:#334155; color:white; text-align:center; padding:15px; border-radius:1rem; font-weight:bold; text-decoration:none; font-size:0.8rem;">EMAIL</a>
                </div>
            """, unsafe_allow_html=True)
            
            st.markdown("</div>", unsafe_allow_html=True)
        else:
            st.info("Configure your project parameters on the left and click 'Generate' to see the AI Engineering analysis.")

def render_invoice():
    est = st.session_state.estimate
    if not est: 
        st.session_state.view = 'calculator'
        st.rerun()
        
    if st.button("← Back to Estimator"):
        st.session_state.view = 'calculator'
        st.rerun()

    st.markdown(f"""
        <div class="invoice-container">
            <div style="border-bottom: 4px solid #000; padding-bottom: 20px; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: end;">
                <div>
                    <h1 style="font-weight:900; font-size:3.5rem; margin:0; line-height:1;">INVOICE</h1>
                    <p style="font-weight:bold; color:#64748B; text-transform:uppercase; letter-spacing:2px;">Project: {est['client_name']}</p>
                </div>
                <div style="text-align: right;">
                    <p style="font-weight:900; color:#1E3A8A; margin:0;">AJAY CONSTRUCTIONS</p>
                    <p style="font-size:0.8rem; color:#64748B; margin:0;">Hyderabad, Telangana</p>
                </div>
            </div>
            
            <div style="margin-bottom: 40px;">
                <h4 style="font-weight:900; color:#1E3A8A; text-transform:uppercase; font-size:0.7rem; border-bottom: 1px solid #EEE; padding-bottom:5px;">Legal Terms & Engineering Guarantee</h4>
                <ol style="font-size: 0.75rem; font-weight:bold; color: #475569; line-height:1.6; padding-left:15px;">
                    <li><b>Timeline:</b> Estimated completion in {est['estimated_days']} days. A 15-day grace period applies.</li>
                    <li><b>Refund:</b> 10% refund of total value if delay exceeds 15 working days past grace period.</li>
                    <li><b>Modification Freeze:</b> No structural changes allowed within 30 days of completion date.</li>
                    <li><b>Validity:</b> Pricing valid for 15 days from {datetime.now().strftime('%d %b %Y')}.</li>
                </ol>
            </div>

            <div style="text-align: right; border-top: 2px solid #000; padding-top: 20px;">
                <p style="font-weight:bold; color:#64748B; text-transform:uppercase; font-size:0.7rem; margin:0;">Grand Total Estimate</p>
                <h1 style="font-weight:900; font-size:4rem; margin:0;">₹{est['totalEstimatedCost']:,}</h1>
            </div>
            
            <div style="margin-top: 50px; text-align: center; color: #94A3B8; font-size: 0.6rem; text-transform: uppercase; font-weight:bold; letter-spacing:1px;">
                AI-Generated Professional Ledger • Verify at Troop Bazaar Regional Office
            </div>
        </div>
    """, unsafe_allow_html=True)
    
    st.button("Print Document", on_click=lambda: st.write("Print triggered"))

# --- MAIN ROUTING ---
render_header()

if st.session_state.view == 'calculator':
    render_calculator()
elif st.session_state.view == 'invoice':
    render_invoice()

# --- SIDEBAR FOOTER ---
with st.sidebar:
    st.markdown(f"### 💼 {BRAND_NAME}")
    st.write("---")
    if st.session_state.history:
        st.write("#### Recent Quotes")
        for item in reversed(st.session_state.history[-5:]):
            st.info(f"**{item['client_name']}**\n₹{item['totalEstimatedCost']:,}")
    else:
        st.write("No history available.")
