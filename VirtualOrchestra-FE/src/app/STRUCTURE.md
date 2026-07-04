# App folder structure

This project follows the Angular Tips folder structure guideline:

- `core/`: global, non-business code instantiated once or used application-wide.
- `features/`: business domains grouped by feature and kept close to routing.
- `shared/`: reusable building blocks that can be consumed by several features.

Recommended shape:

```text
src/app
├── core
│   ├── auth
│   ├── errors
│   ├── guards
│   ├── interceptors
│   ├── layout
│   └── providers
├── features
│   ├── dashboard
│   ├── orchestra
│   └── piano
│       ├── keyboard
│       ├── practice
│       └── piano.routes.ts
└── shared
    ├── components
    ├── directives
    ├── models
    ├── pipes
    ├── services
    ├── tokens
    └── utils
```

Notes:

- Group feature files by domain, not by technical type.
- Keep files that belong to the same feature next to each other.
- Global runtime and HTTP error handling belongs under `core/errors`.
- Avoid importing from `features` into `core`, and avoid importing from `core` or `features` into `shared`.
