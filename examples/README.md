# Running the Examples

## Server Setup

The examples need access to both the solver AND the utils package.

**Run server from parent blackbox directory:**

```bash
cd /home/p0qp0q/blackbox
python3 -m http.server 8080
```

Then open:
- http://localhost:8080/p0qp0q-IK-Solver/examples/octahedral-demo.html
- http://localhost:8080/p0qp0q-IK-Solver/examples/auto-constraint-demo.html
- http://localhost:8080/p0qp0q-IK-Solver/examples/basic-leg-ik.html

## Why?

The examples import from `../../p0qp0q-animation-utils/` which requires:
```
/home/p0qp0q/blackbox/         ← Server root
├── p0qp0q-IK-Solver/
│   └── examples/
│       └── demo.html           ← You are here
└── p0qp0q-animation-utils/     ← Needs to access this
    └── src/index.js
```

## Alternative: Use npm packages (future)

Once published to npm, you can use importmaps:

```html
<script type="importmap">
{
  "imports": {
    "@p0qp0q/animation-utils": "https://unpkg.com/@p0qp0q/animation-utils",
    "p0qp0q-ik-solver": "https://unpkg.com/p0qp0q-ik-solver"
  }
}
</script>
```
