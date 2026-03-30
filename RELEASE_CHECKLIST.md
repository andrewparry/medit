# Release Checklist for v1.1.0

> **Status: Released** — v1.1.0 was released on 2025-12-30. This file is retained as a historical record and template for future releases. Unchecked items reflect tasks that were either completed via other means or deferred.

## Pre-Release Verification

### Code Quality

- [x] All documented validation commands pass in a clean clone
- [x] No linter errors
- [ ] Review current `npm audit` output and document any accepted dev-only risk
- [x] Code formatted with Prettier
- [x] All documentation up to date

### Repository Health

- [x] README.md complete with badges
- [x] CONTRIBUTING.md created
- [x] CODE_OF_CONDUCT.md created
- [x] SECURITY.md created
- [x] CHANGELOG.md created and up to date
- [x] LICENSE file present (MIT)
- [x] NOTICE file with third-party attributions
- [x] .gitignore properly configured
- [x] No sensitive data in repository

### GitHub Setup

- [x] Issue templates created (bug report, feature request)
- [x] Pull request template created
- [x] GitHub Actions workflows configured (CI, Lint, Pages)
- [x] Dependabot configured
- [ ] GitHub repository settings configured:
    - [ ] Enable GitHub Pages with GitHub Actions artifact deployment
    - [ ] Enable Discussions (Settings > General > Features)
    - [ ] Add repository description
    - [ ] Add repository topics/tags
    - [ ] Configure branch protection for main
- [x] Community health files in place

### Testing & Quality

- [x] Manual testing completed
- [ ] Accessibility review completed and evidence linked
- [x] Browser compatibility tested
- [ ] Current security audit reviewed and any accepted risk documented
- [ ] Performance validation reviewed and evidence linked
- [ ] Validation evidence linked from CI runs, issues, or release notes

## Release Steps

### 1. Final Verification

```bash
# Run all tests
npm test

# Run linter
npm run lint

# Check formatting
npm run format:check

# Security audit
npm audit
```

### 2. Create Git Tag

```bash
# Ensure you're on main branch with latest changes
git checkout main
git pull origin main

# Create annotated tag
git tag -a v1.1.0 -m "Release v1.1.0"

# Push tag to GitHub
git push origin v1.1.0
```

### 3. Create GitHub Release

1. Go to https://github.com/andrewparry/medit/releases/new
2. Select tag: v1.1.0
3. Release title: "v1.1.0"
4. Use content from `.github/RELEASE_TEMPLATE.md`
5. Attach source code archives (auto-generated)
6. Check "Set as the latest release"
7. Publish release

### 4. Deploy to GitHub Pages

```bash
# GitHub Actions will auto-deploy, or manually:
# Ensure GitHub Pages is enabled in repository settings
# Source: GitHub Actions artifact
```

### 5. Verify Deployment

- [ ] Visit https://andrewparry.github.io/medit/
- [ ] Test all major features
- [ ] Verify no console errors
- [ ] Test on mobile device

### 6. Post-Release

- [ ] Update any "unreleased" links in documentation
- [ ] Verify all badges in README display correctly
- [ ] Test CI/CD pipeline with a small PR
- [ ] Monitor for issues in first 24 hours

## GitHub Repository Configuration

### Repository Settings

**General:**

- Description: "A pure client-side markdown editor with live preview - no server required"
- Website: https://andrewparry.github.io/medit/
- Topics: `markdown`, `editor`, `wysiwyg`, `javascript`, `client-side`, `static`, `offline`, `markdown-editor`, `text-editor`, `accessibility`, `file-system-access-api`, `no-backend`

**Features:**

- ✅ Wikis: Disabled
- ✅ Issues: Enabled
- ✅ Sponsorships: Optional (GitHub Sponsors)
- ✅ Projects: Disabled (use Issues)
- ✅ Discussions: Enable after release

**Pull Requests:**

- ✅ Allow squash merging
- ✅ Allow merge commits
- ✅ Allow rebase merging
- ✅ Automatically delete head branches

**Pages:**

- Source: GitHub Actions artifact deployment
- Custom domain: (optional)

**Branch Protection (main branch):**

- ✅ Require pull request before merging
- ✅ Require status checks to pass before merging
    - Required checks: CI, Lint
- ✅ Require branches to be up to date before merging
- ✅ Require conversation resolution before merging
- ✅ Include administrators

### Issue Labels

Create the following labels:

- `bug` (red) - Something isn't working
- `enhancement` (blue) - New feature or request
- `documentation` (green) - Improvements or additions to documentation
- `good first issue` (purple) - Good for newcomers
- `help wanted` (yellow) - Extra attention is needed
- `question` (pink) - Further information is requested
- `wontfix` (white) - This will not be worked on
- `duplicate` (gray) - This issue or pull request already exists
- `dependencies` (cyan) - Dependency updates
- `security` (red) - Security-related issue
- `performance` (orange) - Performance improvements
- `accessibility` (blue) - Accessibility improvements
- `triage` (yellow) - Needs triage

## Post-Launch Monitoring

### Week 1 Tasks

- [ ] Respond to all issues within 24 hours
- [ ] Engage with community feedback
- [ ] Fix any critical bugs immediately
- [ ] Update documentation based on questions
- [ ] Thank contributors and early adopters

### Week 2-4 Tasks

- [ ] Review and triage all issues
- [ ] Merge approved pull requests
- [ ] Plan next minor release
- [ ] Update roadmap based on feedback
- [ ] Write retrospective blog post

## Success Metrics

Track the following after release:

**Week 1:**

- GitHub stars: [Target: 50]
- Forks: [Target: 10]
- Issues opened: [Target: 5-10]
- Pull requests: [Target: 1-2]

**Month 1:**

- GitHub stars: [Target: 100]
- Forks: [Target: 20]
- Contributors: [Target: 5]
- Discussions: [Target: 10 topics]

**Quarter 1:**

- GitHub stars: [Target: 250]
- Regular contributors: [Target: 10]
- Community engagement: Active discussions
- Adoption: Featured in awesome-lists

## Rollback Plan

If critical issues are discovered:

1. Add prominent notice to README
2. Document the issue in a GitHub issue
3. Pin the issue to repository
4. Create hotfix branch
5. Release a patch version with fix ASAP
6. Update release notes

## Notes

- Keep calm and iterate
- Community feedback is gold
- Respond professionally to all feedback
- Document lessons learned
- Celebrate the launch! 🎉

---

**Prepared by**: Comprehensive review and planning
**Date**: December 30, 2025
**Status**: Template updated for truthful release checks
