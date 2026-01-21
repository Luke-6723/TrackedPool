# postgres-tracked-pool

## 📦 Publishing Instructions

This package is configured for automatic publishing to npm via GitHub Actions.

### Prerequisites

1. **npm account**: Create one at https://www.npmjs.com/signup
2. **GitHub repository**: Already set up at https://github.com/Luke-6723/TrackedPool

### Automatic Publishing Setup

#### 1. Generate npm Access Token

1. Log in to [npmjs.com](https://www.npmjs.com/)
2. Click on your profile picture → **Access Tokens**
3. Click **Generate New Token** → **Classic Token**
4. Select **Automation** (for CI/CD use)
5. Copy the generated token (you'll only see it once!)

#### 2. Add npm Token to GitHub Secrets

1. Go to https://github.com/Luke-6723/TrackedPool/settings/secrets/actions
2. Click **New repository secret**
3. Name: `NPM_TOKEN`
4. Value: Paste the npm token from step 1
5. Click **Add secret**

#### 3. How Automatic Publishing Works

The GitHub Actions workflow automatically:

1. **Runs tests** on every push and PR
2. **Builds** the TypeScript code
3. **Publishes to npm** (only on master branch pushes) with automatic versioning:
   - Default: Patch version bump (1.0.0 → 1.0.1)
   - Add `[minor]` in commit message for minor bump (1.0.0 → 1.1.0)
   - Add `[major]` in commit message for major bump (1.0.0 → 2.0.0)
   - Add `[noversion]` to skip publishing

**Example commits:**
```bash
# Patch bump (default)
git commit -m "fix: resolve query tracking issue"

# Minor bump
git commit -m "feat: add new tracking feature [minor]"

# Major bump  
git commit -m "feat: breaking API changes [major]"

# No publish
git commit -m "docs: update README [noversion]"
```

### Manual Publishing (First Time)

For the initial publish, you may want to do it manually:

```bash
# Login to npm (first time only)
npm login

# Build the package
npm run build

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
