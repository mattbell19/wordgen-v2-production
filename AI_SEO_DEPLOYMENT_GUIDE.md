# 🚀 AI SEO Agent Service - Deployment Guide

## 📋 **Deployment Options**

You have two deployment options for the AI SEO Agent Service:

### **Option 1: Separate Microservice (Recommended) ✅**
- Deploy AI SEO Agent as separate Heroku app
- **Benefits**: Independent scaling, isolated resources, better performance
- **Cost**: ~$7/month for separate dyno + database
- **Best for**: Production use, scalability, isolation

### **Option 2: Integrate into Main App**
- Add AI SEO agents directly to existing WordGen app
- **Benefits**: Single deployment, shared resources
- **Considerations**: Increased complexity in main app
- **Best for**: Development, cost savings

**We recommend Option 1 (separate microservice)** for better architecture and performance.

---

## 🚀 **Option 1: Deploy as Separate Microservice**

### **Quick Deploy (Recommended)**

1. **Navigate to the AI SEO service directory:**
```bash
cd ai-seo-agent-service
```

2. **Run the quick deploy script:**
```bash
./quick-deploy.sh
```

3. **Follow the prompts:**
   - Enter your OpenAI API key when prompted
   - The script will handle everything else automatically

### **Manual Deploy**

If you prefer manual control:

```bash
# 1. Create Heroku app
heroku create wordgen-ai-seo-agent

# 2. Add database and Redis
heroku addons:create heroku-postgresql:essential-0
heroku addons:create heroku-redis:mini

# 3. Set environment variables
heroku config:set OPENAI_API_KEY=your_openai_key
heroku config:set SERVICE_PORT=$PORT
heroku config:set SERVICE_HOST=0.0.0.0
heroku config:set DEBUG=False

# 4. Deploy
heroku stack:set container
git add .
git commit -m "Deploy AI SEO Agent Service"
git push heroku main
heroku ps:scale web=1
```

### **Connect to Main WordGen App**

After deploying the microservice, connect it to your main WordGen app:

```bash
# Set the AI SEO service URL in your main WordGen app
heroku config:set AI_SEO_SERVICE_URL=https://wordgen-ai-seo-agent.herokuapp.com --app your-wordgen-app
```

---

## 🔧 **Option 2: Integrate into Main App**

If you prefer to integrate the AI SEO agents directly into your existing WordGen app:

### **Steps:**

1. **Copy the agents to your main app:**
```bash
# From the wordgenv2-main directory
cp -r ai-seo-agent-service/app/agents server/agents
cp -r ai-seo-agent-service/app/workflows server/workflows
cp ai-seo-agent-service/app/services/llm.py server/services/llm.ts
```

2. **Install dependencies in your main app:**
```bash
# Add to your main package.json
npm install langchain @langchain/openai
```

3. **Update your main app's environment variables:**
```bash
heroku config:set OPENAI_API_KEY=your_openai_key --app your-wordgen-app
```

4. **Import and use the agents in your main app:**
```typescript
// In your main app
import { AISEOGenerator } from './agents/coordinator';
```

---

## ⚙️ **Configuration**

### **Required Environment Variables**

For the AI SEO service (Option 1):
```bash
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL=postgresql://... (auto-set by Heroku)
REDIS_URL=redis://... (auto-set by Heroku)
SERVICE_PORT=$PORT (auto-set by Heroku)
SERVICE_HOST=0.0.0.0
DEBUG=False
LOG_LEVEL=INFO
```

For the main WordGen app (both options):
```bash
AI_SEO_SERVICE_URL=https://wordgen-ai-seo-agent.herokuapp.com (Option 1 only)
OPENAI_API_KEY=your_openai_api_key_here (Option 2 only)
```

### **OpenAI API Key Setup**

1. **Get your OpenAI API key:**
   - Go to https://platform.openai.com/api-keys
   - Create a new API key
   - Copy the key (starts with `sk-`)

2. **Set the API key:**
```bash
# For separate microservice (Option 1)
heroku config:set OPENAI_API_KEY=sk-your-key-here --app wordgen-ai-seo-agent

# For main app integration (Option 2)
heroku config:set OPENAI_API_KEY=sk-your-key-here --app your-wordgen-app
```

---

## 🧪 **Testing Your Deployment**

### **Health Check**
```bash
# For separate microservice
curl https://wordgen-ai-seo-agent.herokuapp.com/health

# Expected response:
{"status": "healthy", "service": "ai-seo-agent-service"}
```

### **API Documentation**
Visit: `https://wordgen-ai-seo-agent.herokuapp.com/docs`

### **Test Article Generation**
```bash
curl -X POST https://wordgen-ai-seo-agent.herokuapp.com/api/v1/generate-article \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["AI content marketing"],
    "target_word_count": 2000,
    "tone": "professional",
    "industry": "technology",
    "user_id": 1
  }'
```

### **Test in WordGen UI**
1. Go to your WordGen app: `https://your-wordgen-app.herokuapp.com`
2. Navigate to `/dashboard/ai-seo`
3. Try generating an article with the new AI SEO tool

---

## 📊 **Monitoring & Logs**

### **View Logs**
```bash
# AI SEO service logs
heroku logs --tail --app wordgen-ai-seo-agent

# Main app logs
heroku logs --tail --app your-wordgen-app
```

### **Monitor Performance**
```bash
# Check dyno status
heroku ps --app wordgen-ai-seo-agent

# Check database
heroku pg:info --app wordgen-ai-seo-agent

# Check Redis
heroku redis:info --app wordgen-ai-seo-agent
```

---

## 💰 **Cost Breakdown**

### **Option 1: Separate Microservice**
- **AI SEO Service**: $7/month (Eco dyno + Essential Postgres + Mini Redis)
- **Main WordGen App**: Your existing costs
- **Total Additional**: ~$7/month

### **Option 2: Integrated**
- **Main WordGen App**: Your existing costs (may need dyno upgrade)
- **Additional**: $0/month
- **Considerations**: May need to upgrade main app dyno for performance

---

## 🎯 **Recommendations**

### **For Production (Recommended)**
- ✅ Use **Option 1: Separate Microservice**
- ✅ Deploy to separate Heroku app
- ✅ Use the quick deploy script
- ✅ Monitor both services independently

### **For Development/Testing**
- ⚡ Use **Option 2: Integrated** for quick testing
- ⚡ Switch to Option 1 before production launch

### **For Scale**
- 🚀 Start with Option 1
- 🚀 Scale AI SEO service independently
- 🚀 Add load balancing if needed

---

## 🆘 **Troubleshooting**

### **Common Issues**

1. **"AI SEO service is unavailable"**
   - Check if the AI SEO service is running: `heroku ps --app wordgen-ai-seo-agent`
   - Verify the service URL is correct in main app config

2. **"OpenAI API key not found"**
   - Set the API key: `heroku config:set OPENAI_API_KEY=your_key --app wordgen-ai-seo-agent`

3. **"Database connection failed"**
   - Check database addon: `heroku addons --app wordgen-ai-seo-agent`
   - Restart the app: `heroku restart --app wordgen-ai-seo-agent`

4. **Slow response times**
   - Upgrade dyno type: `heroku ps:type web=standard-1x --app wordgen-ai-seo-agent`
   - Check OpenAI API rate limits

### **Getting Help**
- Check logs: `heroku logs --tail --app wordgen-ai-seo-agent`
- View app status: `heroku ps --app wordgen-ai-seo-agent`
- Test health endpoint: `curl https://wordgen-ai-seo-agent.herokuapp.com/health`

---

## ✅ **Success Checklist**

- [ ] AI SEO service deployed and running
- [ ] Health check returns "healthy"
- [ ] OpenAI API key configured
- [ ] Database and Redis connected
- [ ] Main WordGen app connected to service
- [ ] UI components working in WordGen dashboard
- [ ] Test article generation successful

---

**🎉 Your AI SEO Agent Service is now ready to revolutionize content creation!**

**Service URL**: `https://wordgen-ai-seo-agent.herokuapp.com`
**API Docs**: `https://wordgen-ai-seo-agent.herokuapp.com/docs`
**WordGen Integration**: `https://your-wordgen-app.herokuapp.com/dashboard/ai-seo`
