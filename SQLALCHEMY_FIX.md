# 🔧 SQLALCHEMY FOREIGN KEY ERROR FIXED

## ❌ **Problém:**
```
AmbiguousForeignKeysError: Could not determine join condition between parent/child tables on relationship User.battle_history - there are multiple foreign key paths linking the tables.
```

**Příčina:** `BattleResult` model má dva foreign keys na `User` tabulku:
- `user_id` (hlavní hráč)
- `opponent_id` (protihráč)

SQLAlchemy nevěděl, který z nich použít pro `User.battle_history` relaci.

## ✅ **Oprava provedena:**

### 1. Specifikoval foreign_keys v User modelu:
```python
# PŘED:
battle_history = db.relationship('BattleResult', backref='user', lazy='dynamic', cascade='all, delete-orphan')

# PO:
battle_history = db.relationship('BattleResult', foreign_keys='BattleResult.user_id', backref='user', lazy='dynamic', cascade='all, delete-orphan')
```

### 2. Přidal explicitní relaci pro opponent v BattleResult:
```python
class BattleResult(db.Model):
    # ... existující sloupce ...
    
    # Explicit relationships
    opponent = db.relationship('User', foreign_keys=[opponent_id], post_update=True)
```

## 🚀 **Výsledek:**
- SQLAlchemy teď ví, že `User.battle_history` používá `user_id`
- `BattleResult.opponent` používá `opponent_id`
- Nejednoznačnost vyřešena!

## 📋 **Další kroky:**
1. **Commit změny** do GitHubu
2. **Redeploy** na Render.com
3. Database initialization by měla projít úspěšně

**SQLAlchemy foreign key error je vyřešen! 🎉**
