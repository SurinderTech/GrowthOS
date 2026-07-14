# 🚀 Mesh API Setup Guide

## Step 1: Create Backend/.env File

Create a new file at `Backend/.env` with your configuration:

```bash
# Mesh LLM Configuration (REQUIRED)
MESH_API_KEY=rsk_01KXAKJE941J16ENARMQG15H3N
MESH_BASE_URL=https://api.meshai.io/v1
MESH_MODEL=mesh-llm-7b

# Supabase (Existing - Keep as is)
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_KEY=your_service_key_here

# Google OAuth (Existing - Keep as is)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

## Step 2: Verify Dependencies

All required dependencies are already in `requirements.txt`:
- ✅ `httpx==0.28.1` - HTTP client for Mesh API
- ✅ `fastapi==0.135.1` - Web framework
- ✅ `python-dotenv` - ENV file loader

Install with:
```bash
cd Backend
pip install -r requirements.txt
```

## Step 3: Test the Connection

Before deploying, verify the Mesh client can initialize:

```python
from Backend.services.mesh_client import create_mesh_model

# This will read your MESH_* env vars
model = create_mesh_model()
print("Model Name:", model.model_name)
print("API Key Set:", bool(model.api_key))
print("Base URL:", model.base_url)
```

## Step 4: Test a Simple Request

```python
from Backend.services.gemini_service import generate_growth_plan

profile = {
    "user_type": "student",
    "primary_goal": "Learn Python",
    "twelve_month_goal": "Become a Python developer",
    "interests": ["programming", "ai"],
    "daily_time": "2-3hours",
    "career_goal": "Software Engineer",
    "productivity_style": "deep_focus",
    "country": "India"
}

result = generate_growth_plan(profile)
print("Plan Generated:", result.get("title"))
```

## Step 5: Run the Backend

```bash
cd Backend
python main.py
```

Or with uvicorn:
```bash
uvicorn main:app --reload --port 8000
```

---

## Troubleshooting

### ❌ Error: "MESH_API_KEY is not set"
- **Cause**: Environment variable not found
- **Fix**: Make sure Backend/.env exists and has MESH_API_KEY set
- **Verify**: `echo $MESH_API_KEY` in terminal (Windows: `echo %MESH_API_KEY%`)

### ❌ Error: "MESH_BASE_URL is not set"
- **Cause**: Base URL configuration missing
- **Fix**: Add MESH_BASE_URL to Backend/.env
- **Example**: `https://api.meshai.io/v1`

### ❌ Error: "MESH_MODEL is not set"
- **Cause**: Model name not configured
- **Fix**: Add MESH_MODEL to Backend/.env
- **Example**: `mesh-llm-7b`

### ❌ Error: "httpx.ConnectError"
- **Cause**: Can't reach Mesh API server
- **Fix**: 
  - Check MESH_BASE_URL is correct
  - Verify internet connection
  - Check if Mesh API is operational

### ❌ Error: "401 Unauthorized"
- **Cause**: Invalid API key
- **Fix**: Double-check MESH_API_KEY value
- **Verify**: Copy-paste from original source

---

## Testing with curl

Test the Mesh endpoint directly:

```bash
curl -X POST https://api.meshai.io/v1/chat/completions \
  -H "Authorization: Bearer YOUR_MESH_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mesh-llm-7b",
    "messages": [{"role": "user", "content": "Hello"}],
    "temperature": 0.7
  }'
```

---

## Performance Notes

Mesh timeouts are set as follows:

- **Growth Plans**: 20 seconds
- **Questions**: 20 seconds
- **Tasks**: 15 seconds
- **Evaluations**: 5 seconds
- **Messages**: 12 seconds

If you get timeout errors, check:
1. Mesh API server status
2. Your network latency
3. API key rate limits
4. Increase timeout in service if needed

---

## File Locations Reference

| Component | File |
|-----------|------|
| Mesh Client | `Backend/services/mesh_client.py` |
| AI Entry Point | `Backend/services/gemini_service.py` |
| Config | `Backend/config.py` |
| Env Vars | `Backend/.env` |
| Question Gen | `Backend/services/question_generator.py` |
| Task Gen | `Backend/services/smart_task_service.py` |
| Evaluation | `Backend/services/evaluator.py` |
| Accountability | `Backend/services/accountability_service.py` |
| Missions | `Backend/routers/missions.py` |

---

## Questions?

All AI functions are now centrally managed through:

```python
from Backend.services.gemini_service import _get_model

model = _get_model()  # Returns MeshModel instance
response = model.generate_content(prompt)
```

This pattern is consistent across all services. No breaking changes to existing logic.
