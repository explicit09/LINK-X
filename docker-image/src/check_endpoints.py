#!/usr/bin/env python3
"""
Check current API endpoints structure
"""

print("📋 CURRENT API ENDPOINT STRUCTURE")
print("="*50)

print("\n🔄 NEW UNIFIED STRUCTURE (app.py):")
print("  /auth/*           - auth_unified.bp (NEW v2 style)")
print("  /api/v1/*         - v1.py (LEGACY compatibility)")
print("  /api/health       - health.bp")

print("\n📊 ENDPOINT MAPPING:")
print("  Frontend (NEW)    -> /auth/* (unified)")
print("  Frontend (LEGACY) -> /api/v1/* (compatibility)")

print("\n🎯 WHAT THE FRONTEND SHOULD USE:")
print("  ✅ NEW: /auth/login")
print("  ❌ OLD: /api/v1/auth/sessionLogin")
print("  ✅ NEW: /auth/me")  
print("  ❌ OLD: /api/v1/auth/me")

print("\n📁 V1 API INCLUDES ALL LEGACY ENDPOINTS:")
print("  /api/v1/auth/*")
print("  /api/v1/courses/*")
print("  /api/v1/files/*")
print("  /api/v1/todos/*")
print("  /api/v1/activities/*")
print("  /api/v1/modules/*")
print("  /api/v1/personalize/*")

print("\n✅ This structure allows:")
print("  - New frontend to use clean /auth/* endpoints")
print("  - Legacy frontend to keep using /api/v1/* endpoints")
print("  - Gradual migration from v1 to v2")

print("\n⚠️  IMPORTANT FOR FRONTEND:")
print("  - Use /auth/* for all NEW authentication")
print("  - Keep /api/v1/* for existing features until migrated")
print("  - Both work, but /auth/* is the future") 