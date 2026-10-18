# injury-detector-api

APIs REST (Lambdas em **Node.js 20**) do InjuryDetector: autenticação (JWT),
CRUD de atleta/diário/treino, dashboard e explicabilidade.

Faz parte de um conjunto de 4 repositórios:

| Repo | Responsabilidade |
|---|---|
| `injury-detector` | Front-end (React + TS) |
| **`injury-detector-api`** | **APIs Node (este repo)** |
| `injury-detector-ml` | Serviço de ML (V4) em container |
| `injury-detector-platform` | Infraestrutura (Terraform) + banco |

## Estrutura

```
src/
├── package.json
├── handlers/        # um handler por Lambda
│   ├── authorizer.mjs       (valida JWT)
│   ├── auth_login.mjs       POST /auth/login
│   ├── athlete_register.mjs POST /athletes
│   ├── athlete_get.mjs      GET  /athletes/{id}
│   ├── athlete_upsert.mjs   PUT  /athletes/{id}
│   ├── daily_get.mjs        GET  /athletes/{id}/daily       (paginado/ordenado)
│   ├── daily_upsert.mjs     POST /athletes/{id}/daily
│   ├── training_get.mjs     GET  /athletes/{id}/trainings   (paginado/ordenado)
│   ├── training_upsert.mjs  POST /athletes/{id}/trainings
│   ├── dashboard_get.mjs    GET  /athletes/{id}/dashboard
│   └── explain_get.mjs      GET  /athletes/{id}/explain     (SHAP)
└── lib/
    ├── db.mjs       pool PostgreSQL (pg)
    ├── auth.mjs     JWT + bcrypt
    └── http.mjs     helpers de resposta HTTP

```

## Variáveis de ambiente (injetadas no deploy pela infra)

`DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, JWT_SECRET, MODEL_VERSION`

## Deploy

O empacotamento e deploy são feitos pelo Terraform em `injury-detector-platform`,
que referencia a pasta `src/` deste repo. Antes do `terraform apply`:

```bash
cd src
npm install --omit=dev
```

Os repos devem ficar como pastas-irmãs (o Terraform usa o caminho
`../../injury-detector-api/src` por padrão; configurável via `api_src_dir`).
