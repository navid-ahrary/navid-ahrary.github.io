---
title: "Avoid granting an Entra app access to all SharePoint sites"

description: "When you need to grant an application read/write access to a specific site (rather than to all sites), there is no graphic interface in the Entra portal or SharePoint admin center. Maybe Microsfot is developing that, or it may be by design (my consideration)."

publishedDate: 2026-08-22

category: "Cloud Security"

tags:
  - Azure
  - Microsoft Entra ID
  - Microsoft Graph
  - Application Access
  - SharePoint

featured: true

draft: false
---


When you need to grant an application read/write access to a specific site (rather than to all sites), there is no graphic interface in the Entra portal or SharePoint admin center. Maybe Microsfot is developing that, or it may be by design (my consideration).

But don't worry. I'll show you how to do it from the **command line** using **only `cURL`** (my good teammate 😉).

## I Use Two Apps (And You Should Too)

> My main app only needs to read one site. But to give it access, I need a second app (helper) with more power.

The two apps:

### Why not give full power to the Target App?

- Too risky, it could access **all sites**
- Hard to control per client

## What You Need

1. **Two Azure Entra apps**
2. - Target App → `Sites.Selected` role
   - Helper App → `Sites.FullControl.All` role
3. **Admin consent** given to both
4. Your:
   - {tenant-id}
   - {client-id} and {client-secret} for both apps
   - Site name (like matrix)
5. **`cURL`** (comes with Mac/Linux; use Git Bash on Windows)
6. **(Recommended) `jq`** — makes JSON easy to read

```bash
# openSUSE
sudo zypper install jq

# Ubuntu/Debian
sudo apt-get update && sudo apt-get install jq

# Fedora
sudo dnf install jq

# Windows (Git Bash via Chocolatey)
# First, install Chocolatey: <https://chocolatey.org/install>
choco install jq

# macOS (with Homebrew)
brew install jq
```

## Step-by-Step: My `cURL` \*\*Workflow

### Step 1: Get Token for Helper App

```bash
curl -X POST https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id={helper-app-id}" \
  -d "client_secret={helper-app-secret}" \
  -d "scope=https://graph.microsoft.com/.default" \
  -d "grant_type=client_credentials"
```

Without `jq`: Look for this line and copy the long string:

`"access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6..."`

### Step 2: Get Site ID

```bash
curl -X GET "https://graph.microsoft.com/v1.0/sites/{tenantname}.sharepoint.com:/sites/{sitename}" \
  -H "Authorization: Bearer {token}"
```

Look for `"id"`: and copy the full value:

`yourtenant.sharepoint.com,abc123...,def456...`

### Step 3: Give Access to Target App

```bash
curl -X POST https://graph.microsoft.com/v1.0/sites/{site-id}/permissions \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{ \
    "roles": ["read"],
    "grantedToIdentities": [{
      "application": {
        "id": "{target-app-client-id}",
        "displayName": "My Bot"
      }
    }]
  }'
```

Want write? Change `read` → `write`

Success → `201 Created`

### Step 4: Test with Target App

Get its token:

```bash
curl -X POST https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token \
  -d "client_id={target-app-client-id}" \
  -d "client_secret={target-app-client-secret}" \
  -d "scope=https://graph.microsoft.com/.default" \
  -d "grant_type=client_credentials"
```

Then test:

```bash
curl -X GET https://graph.microsoft.com/v1.0/sites/{site-id}/permissions \
  -H "Authorization: Bearer {target-token}"
```

Works → you see your app in the list Fails → `403` → check IDs or consent

Save as `give-access.sh`:

```bash
#!/bin/bash

TENANT_NAME="tenant-name"         # example: navidahrary-tenant
TENANT_ID="tenant-id"             # example: tenantid-1111-2222-3333-4444
SITE="your-site"                  # example: matrix

TARGET_APP_ID="target-appid"      # example: targetid-1111-2222-3333-4444
TARGET_APP_NAME="target-appname"  # example: app-matrix-backup
HELPER_ID="helper-appid"          # example: helperid-1111-2222-3333-4444
HELPER_SECRET="helper-app-secret" # example: .Yerkejrk~...

echo "Getting token..."
TOKEN=$(curl -s -X POST https://login.microsoftonline.com/$TENANT_ID/oauth2/v2.0/token \
  -d "client_id=$HELPER_ID" \
  -d "client_secret=$HELPER_SECRET" \
  -d "scope=https://graph.microsoft.com/.default" \
  -d "grant_type=client_credentials" | jq -r .access_token)

echo "Finding site..."
SITE_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
https://graph.microsoft.com/v1.0/sites/$TENANT_NAME.sharepoint.com:/sites/$SITE | jq -r .id)

echo "Giving access..."
curl -s -X POST https://graph.microsoft.com/v1.0/sites/$SITE_ID/permissions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
 -d '{
    "roles": ["read"],
    "grantedToIdentities": [{
      "application": {
        "id": "$TARGET_APP_ID",
        "displayName": "$TARGET_APP_NAME"
      }
    }]
  }'
  
echo "Done! Access given to site: $SITE"
```

Run: `chmod +x give-access.sh && ./give-access.sh`

## When I Use This

- SaaS tools that connect to **customer sites only**
- Backup bots that **don’t need full access**
- Audit tools for **specific sites**

## Final Words

No `PowerShell`. No `Azure-CLI`. Just **`cURL` + API = full control**.

It’s:

- Safe (only allowed sites)
- Works anywhere (Linux/Mac/Windows)
- No need for additional tools
- Great for automation
