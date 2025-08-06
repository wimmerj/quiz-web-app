# 🔧 DATABASE CONNECTION FIX - Internal vs External URL

## ❌ **PROBLÉM IDENTIFIKOVÁN:**
```json
{"database":"disconnected","monica_ai":"enabled","status":"healthy"}
```

**ROOT CAUSE:** Backend pravděpodobně používá External Database URL místo Internal URL!

---

## 🛠️ **IMMEDIATE FIX STEPS:**

### 1️⃣ **Zkontrolujte Environment Variables v Render.com**

1. **Jděte do Web Service Dashboard**
2. **Environment** tab
3. **Najděte `DATABASE_URL`**

**Problém:** Pokud tam vidíte External URL jako:
```
postgres://quiz_user:password@dpg-xyz-a.frankfurt-postgres.render.com/quiz_modular
```

**Řešení:** Mělo by tam být Internal URL:
```
postgresql://quiz_user:password@dpg-xyz/quiz_modular
```

### 2️⃣ **MANUAL FIX - Option A (Doporučeno)**

**V Render.com Web Service Environment Variables:**

1. **Smažte** současnou `DATABASE_URL` variable
2. **Přidejte novou** s těmito settings:
   ```
   Key: DATABASE_URL
   Value: [Select from dropdown] → Choose your PostgreSQL database
   ```
3. **Save Changes**
4. **Deploy**

### 2️⃣ **MANUAL FIX - Option B (Rychlé)**

**Pokud vidíte External URL, změňte ho na Internal:**

**PŘED (External - nefunkční):**
```
postgres://quiz_user:pass@dpg-xyz-a.frankfurt-postgres.render.com/quiz_modular
```

**PO (Internal - funkční):**
```
postgresql://quiz_user:pass@dpg-xyz/quiz_modular
```

**Postup:**
1. Copy External URL
2. Odstraňte `-a.frankfurt-postgres.render.com` část
3. Změňte `postgres://` na `postgresql://`
4. Save a Deploy

---

## 🔍 **VERIFICATION STEPS:**

### Po opravě zkontrolujte:

1. **Environment Variables obsahují Internal URL:**
   ```
   DATABASE_URL=postgresql://quiz_user:password@dpg-xyz/quiz_modular
   ```

2. **Redeploy Web Service:**
   - Settings → Manual Deploy → Deploy latest commit

3. **Test Health Check:**
   ```
   https://quiz-modular-backend.onrender.com/api/health
   ```

4. **Expected Output:**
   ```json
   {
     "database": "connected",    // ← Should be "connected" now!
     "status": "healthy"
   }
   ```

---

## 🎯 **WHY THIS HAPPENS:**

- **Internal URL:** Funguje pouze uvnitř Render network (rychlejší, bezpečnější)
- **External URL:** Pro externí connections (pomalejší, ne pro production apps)
- **Auto-config:** `render.yaml` by měl automaticky použít Internal, ale někdy se to neděje

---

## 🚀 **EXPECTED RESULT:**

Po opravě by `/api/health` mělo vrátit:
```json
{
  "status": "healthy",
  "database": "connected",     // ✅ FIXED!
  "monica_ai": "enabled",
  "timestamp": "2025-08-06T...",
  "version": "2.0.0-modular"
}
```

**Zkuste Option A první - je to nejbezpečnější řešení! 🎉**
