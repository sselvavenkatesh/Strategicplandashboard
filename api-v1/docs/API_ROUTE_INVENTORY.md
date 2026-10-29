# Registered route inventory

Generated from FastAPI; paths below include the `/api/v1` prefix. See [API documentation](API_DOCUMENTATION.md) for payloads and behavior.

| Method | Path | Access | Parameters | JSON request |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/achievement` | Public | preview (query, optional) | `—` |
| GET | `/api/v1/indicators/{indicator_id}/target` | Public | indicator_id (path, required), school_year (query, required), preview (query, optional) | `—` |
| GET | `/api/v1/indicator-labels` | Public | — | `—` |
| GET | `/api/v1/preview/dataset` | Public; feature gated | — | `—` |
| GET | `/health` | Public | — | `—` |
| GET | `/api/v1/bootstrap` | Public | — | `—` |
| GET | `/api/v1/profile` | Public | — | `—` |
| GET | `/api/v1/goals` | Public | — | `—` |
| GET | `/api/v1/goals/{goal_id}/indicators` | Public | goal_id (path, required), school (query, optional) | `—` |
| GET | `/api/v1/indicators/{indicator_id}/history` | Public | indicator_id (path, required), school (query, optional) | `—` |
| GET | `/api/v1/indicators/{indicator_id}/student-groups` | Public | indicator_id (path, required), school_year (query, required), school (query, optional) | `—` |
| GET | `/api/v1/goals/{goal_id}/initiative-progress` | Public | goal_id (path, required), school (query, optional) | `—` |
| GET | `/api/v1/goals/{goal_id}/initiatives` | Public | goal_id (path, required), school (query, optional) | `—` |
| GET | `/api/v1/goals/{goal_id}/initiatives/{initiative_id}/subinitiatives` | Public | goal_id (path, required), initiative_id (path, required), school (query, optional) | `—` |
| GET | `/api/v1/features/{version}/{feature}` | Public | version (path, required), feature (path, required) | `—` |
| GET | `/api/v1/goals/{goal_id}/initiatives-full` | Public | goal_id (path, required) | `—` |
| GET | `/api/v1/admin/signin-config` | Public | — | `—` |
| PUT | `/api/v1/superadmin/oauth-secrets` | Legacy token; writes gated | — | `OAuthSecrets` |
| POST | `/api/v1/auth/admin/login` | Legacy authentication | — | `AdminLogin` |
| GET | `/api/v1/auth/admin/oauth/{provider}/start` | OAuth provider flow; current and legacy callbacks | provider (path, required), return_to (query, optional) | `—` |
| GET | `/api/v1/auth/admin/oauth/{provider}/callback` | OAuth provider flow; current and legacy callbacks | provider (path, required), code (query, optional), state (query, optional), error (query, optional) | `—` |
| GET | `/api/v1/auth/admin/session` | Legacy authentication | token (query, required) | `—` |
| POST | `/api/v1/auth/admin/logout` | Legacy authentication | token (query, required) | `—` |
| POST | `/api/v1/auth/admin/sso/validate` | Legacy authentication | — | `SsoAdminValidation` |
| POST | `/api/v1/access-log` | Public | — | `AccessLog` |
| POST | `/api/v1/superadmin/login` | Public | — | `AdminLogin` |
| GET | `/api/v1/superadmin/configuration` | Legacy token; writes gated | token (query, required) | `—` |
| PUT | `/api/v1/superadmin/configuration` | Legacy token; writes gated | — | `SuperAdminConfiguration` |
| DELETE | `/api/v1/superadmin/goals/{goal_id}` | Legacy token; writes gated | goal_id (path, required), token (query, required) | `—` |
| PUT | `/api/v1/superadmin/logo` | Legacy token; writes gated | — | `SuperAdminLogo` |
| POST | `/api/v1/superadmin/indicators/bulk` | Legacy token; writes gated | — | `SuperAdminBulkData` |
| POST | `/api/v1/superadmin/initiatives/bulk` | Legacy token; writes gated | — | `SuperAdminBulkData` |
| GET | `/api/v1/ai/status` | Public | — | `—` |
| POST | `/api/v1/ai/ask` | Public; validated cookies permit private context | — | `AiQuestion` |
| GET | `/api/v1/validation` | Diagnostic; disabled by default | — | `—` |
| GET | `/validation` | Diagnostic; disabled by default | — | `—` |
| GET | `/api/v1/superadmin/session` | Super Admin cookie | — | `—` |
| GET | `/api/v1/superadmin/workspace` | Super Admin cookie | — | `—` |
| POST | `/api/v1/superadmin/workspace` | Super Admin cookie | — | `SaveWorkspace` |
| GET | `/api/v1/superadmin/users` | Super Admin cookie | — | `—` |
| POST | `/api/v1/superadmin/users` | Super Admin cookie | — | `SaveUser` |
| GET | `/api/v1/superadmin/sso-settings` | Super Admin cookie | — | `—` |
| POST | `/api/v1/superadmin/sso-settings` | Super Admin cookie | — | `SsoSecrets` |
| GET | `/api/v1/superadmin/ai-settings` | Super Admin cookie | — | `—` |
| POST | `/api/v1/superadmin/ai-settings` | Super Admin cookie | — | `AiSettings` |
| POST | `/api/v1/superadmin/logout` | Super Admin cookie if present; clears cookie | — | `—` |
| POST | `/api/v1/admin/login` | Public | — | `Login` |
| GET | `/api/v1/admin/session` | Admin cookie | — | `—` |
| GET | `/api/v1/admin/workspace` | Admin cookie | — | `—` |
| POST | `/api/v1/admin/workspace` | Admin cookie | — | `Save` |
| POST | `/api/v1/admin/logout` | Admin cookie if present; clears cookie | — | `—` |

Total: **51 registered operations**. Includes compatibility and diagnostic operations; this is not a claim that every operation is production enabled.

## Request schemas

### AccessLog

```json
{
  "properties": {
    "sessionId": {
      "type": "string",
      "title": "Sessionid"
    },
    "userId": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "title": "Userid"
    },
    "userName": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "title": "Username"
    },
    "userEmail": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "title": "Useremail"
    },
    "userType": {
      "type": "string",
      "title": "Usertype",
      "default": "Public"
    },
    "region": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "title": "Region"
    },
    "country": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "title": "Country"
    },
    "pagePath": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "title": "Pagepath"
    },
    "userAgent": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "title": "Useragent"
    }
  },
  "type": "object",
  "required": [
    "sessionId"
  ],
  "title": "AccessLog"
}
```

### AdminLogin

```json
{
  "properties": {
    "email": {
      "type": "string",
      "title": "Email"
    },
    "password": {
      "type": "string",
      "title": "Password"
    }
  },
  "type": "object",
  "required": [
    "email",
    "password"
  ],
  "title": "AdminLogin"
}
```

### AiQuestion

```json
{
  "properties": {
    "question": {
      "type": "string",
      "maxLength": 1200,
      "minLength": 3,
      "title": "Question"
    },
    "sessionId": {
      "type": "string",
      "maxLength": 100,
      "title": "Sessionid"
    }
  },
  "additionalProperties": false,
  "type": "object",
  "required": [
    "question"
  ],
  "title": "AiQuestion"
}
```

### AiSettings

```json
{
  "properties": {
    "model": {
      "type": "string",
      "maxLength": 150,
      "minLength": 1,
      "title": "Model"
    },
    "apiKey": {
      "anyOf": [
        {
          "type": "string",
          "maxLength": 4000
        },
        {
          "type": "null"
        }
      ],
      "title": "Apikey"
    }
  },
  "additionalProperties": false,
  "type": "object",
  "required": [
    "model"
  ],
  "title": "AiSettings"
}
```

### Login

```json
{
  "properties": {
    "email": {
      "type": "string",
      "maxLength": 254,
      "minLength": 1,
      "title": "Email"
    },
    "password": {
      "type": "string",
      "minLength": 1,
      "title": "Password"
    }
  },
  "additionalProperties": false,
  "type": "object",
  "required": [
    "email",
    "password"
  ],
  "title": "Login"
}
```

### OAuthSecrets

```json
{
  "properties": {
    "token": {
      "type": "string",
      "title": "Token"
    },
    "googleClientSecret": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "title": "Googleclientsecret"
    },
    "microsoftClientSecret": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "title": "Microsoftclientsecret"
    }
  },
  "type": "object",
  "required": [
    "token"
  ],
  "title": "OAuthSecrets"
}
```

### Save

```json
{
  "properties": {
    "revision": {
      "type": "string",
      "maxLength": 32,
      "minLength": 32,
      "title": "Revision"
    },
    "kind": {
      "type": "string",
      "title": "Kind"
    },
    "rows": {
      "items": {
        "additionalProperties": true,
        "type": "object"
      },
      "type": "array",
      "maxItems": 5000,
      "title": "Rows"
    }
  },
  "additionalProperties": false,
  "type": "object",
  "required": [
    "revision",
    "kind",
    "rows"
  ],
  "title": "Save"
}
```

### SaveUser

```json
{
  "properties": {
    "revision": {
      "type": "string",
      "maxLength": 32,
      "minLength": 32,
      "title": "Revision"
    },
    "user": {
      "additionalProperties": true,
      "type": "object",
      "title": "User"
    }
  },
  "type": "object",
  "required": [
    "revision",
    "user"
  ],
  "title": "SaveUser"
}
```

### SaveWorkspace

```json
{
  "properties": {
    "revision": {
      "type": "string",
      "maxLength": 32,
      "minLength": 32,
      "title": "Revision"
    },
    "change": {
      "additionalProperties": true,
      "type": "object",
      "title": "Change"
    }
  },
  "type": "object",
  "required": [
    "revision",
    "change"
  ],
  "title": "SaveWorkspace"
}
```

### SsoAdminValidation

```json
{
  "properties": {
    "email": {
      "type": "string",
      "title": "Email"
    }
  },
  "type": "object",
  "required": [
    "email"
  ],
  "title": "SsoAdminValidation"
}
```

### SsoSecrets

```json
{
  "properties": {
    "googleSecret": {
      "anyOf": [
        {
          "type": "string",
          "maxLength": 4000
        },
        {
          "type": "null"
        }
      ],
      "title": "Googlesecret"
    },
    "microsoftSecret": {
      "anyOf": [
        {
          "type": "string",
          "maxLength": 4000
        },
        {
          "type": "null"
        }
      ],
      "title": "Microsoftsecret"
    }
  },
  "type": "object",
  "title": "SsoSecrets"
}
```

### SuperAdminBulkData

```json
{
  "properties": {
    "token": {
      "type": "string",
      "title": "Token"
    },
    "rows": {
      "items": {
        "additionalProperties": true,
        "type": "object"
      },
      "type": "array",
      "title": "Rows"
    }
  },
  "type": "object",
  "required": [
    "token",
    "rows"
  ],
  "title": "SuperAdminBulkData"
}
```

### SuperAdminConfiguration

```json
{
  "properties": {
    "token": {
      "type": "string",
      "title": "Token"
    },
    "profile": {
      "additionalProperties": true,
      "type": "object",
      "title": "Profile"
    },
    "goals": {
      "items": {
        "additionalProperties": true,
        "type": "object"
      },
      "type": "array",
      "title": "Goals"
    }
  },
  "type": "object",
  "required": [
    "token",
    "profile",
    "goals"
  ],
  "title": "SuperAdminConfiguration"
}
```

### SuperAdminLogo

```json
{
  "properties": {
    "token": {
      "type": "string",
      "title": "Token"
    },
    "logo": {
      "type": "string",
      "title": "Logo"
    }
  },
  "type": "object",
  "required": [
    "token",
    "logo"
  ],
  "title": "SuperAdminLogo"
}
```

