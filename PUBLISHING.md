# postgres-tracked-pool

## 📦 Publishing Instructions

This package is ready to publish to npm and GitHub.

### Prerequisites

1. **npm account**: Create one at https://www.npmjs.com/signup
2. **GitHub repository**: Create a new repo at https://github.com/new

### Setup Steps

#### 1. Initialize Git Repository

```bash
cd /home/luke/Desktop/Dev/topstats/TrackedPool
git init
git add .
git commit -m "Initial commit: postgres-tracked-pool v1.0.0"
```

#### 2. Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `postgres-tracked-pool`
3. Description: "PostgreSQL connection pool wrapper with automatic query tracking"
4. Keep it public (or private if preferred)
5. **Don't** initialize with README (we already have one)
6. Click "Create repository"

#### 3. Push to GitHub

```bash
git remote add origin https://github.com/top-stats/postgres-tracked-pool.git
git branch -M main
git push -u origin main
```

#### 4. Publish to npm

```bash
# Login to npm (first time only)
npm login

# Publish the package
npm publish
```

**Note**: The package name `postgres-tracked-pool` must be available on npm. If it's taken, update the `name` field in `package.json`.

### Verify Installation

After publishing, test the installation:

```bash
npm install postgres-tracked-pool
```

### Update Package.json URLs

After creating the GitHub repo, the URLs in package.json are already configured for:
- Repository: `https://github.com/top-stats/postgres-tracked-pool.git`
- Issues: `https://github.com/top-stats/postgres-tracked-pool/issues`
- Homepage: `https://github.com/top-stats/postgres-tracked-pool#readme`

If your GitHub username is different from `top-stats`, update these URLs in `package.json`.

### Version Updates

When making updates:

```bash
# Update version (patch/minor/major)
npm version patch

# Build
npm run build

# Publish
npm publish
```

### Package Structure

```
TrackedPool/
├── src/
│   ├── TrackedPool.ts    # Main implementation
│   └── index.ts          # Exports
├── examples/
│   └── basic.ts          # Usage examples
├── dist/                 # Built files (generated)
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE
├── CHANGELOG.md
├── .gitignore
└── .npmignore
```

### npm Package Contents

When published, the package will include:
- `dist/` - Compiled JavaScript and TypeScript definitions
- `README.md` - Documentation
- `LICENSE` - MIT license

It will **exclude** (via .npmignore):
- Source files (`src/`)
- Examples
- Development files
- Tests (if added later)

### Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test locally in another project
cd /path/to/other/project
npm install /home/luke/Desktop/Dev/topstats/TrackedPool
```

### Badges (Optional)

Add these to the top of README.md after publishing:

```markdown
[![npm version](https://badge.fury.io/js/postgres-tracked-pool.svg)](https://www.npmjs.com/package/postgres-tracked-pool)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm downloads](https://img.shields.io/npm/dm/postgres-tracked-pool.svg)](https://www.npmjs.com/package/postgres-tracked-pool)
```

### Support

After publishing, users can:
- Report issues: GitHub Issues
- Ask questions: GitHub Discussions
- View documentation: README.md on GitHub/npm

### Checklist

- [x] Package structure created
- [x] TypeScript compilation configured
- [x] Dependencies specified (pg as peer dependency)
- [x] README.md written
- [x] LICENSE added (MIT)
- [x] .gitignore configured
- [x] .npmignore configured
- [x] CHANGELOG.md created
- [x] Examples added
- [ ] Git repository initialized
- [ ] GitHub repository created
- [ ] Pushed to GitHub
- [ ] Published to npm
- [ ] Tested installation

---

**Ready to publish!** 🚀
