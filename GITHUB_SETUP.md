# GitHub Repository Setup Guide

This guide provides step-by-step instructions for configuring the GitHub repository settings to maximize community engagement and project visibility.

## Repository Information

- **URL**: https://github.com/andrewparry/medit
- **Description**: A browser-based markdown WYSIWYG editor with real-time preview and offline support
- **Website**: https://andrewparry.github.io/medit/

## Step 1: General Settings

Navigate to: **Settings > General**

### About Section (Top Right of Repo Main Page)

1. Click the gear icon ⚙️ next to "About"
2. Fill in:
    - **Description**: "A browser-based markdown WYSIWYG editor with real-time preview and offline support"
    - **Website**: `https://andrewparry.github.io/medit/`
    - **Topics**: Add the following tags:
        - `markdown`
        - `editor`
        - `wysiwyg`
        - `javascript`
        - `browser-based`
        - `offline`
        - `markdown-editor`
        - `text-editor`
        - `accessibility`
        - `wcag`
        - `open-source`
3. Click "Save changes"

### Features Section

Enable/disable features:

- [ ] ❌ **Wikis**: Not needed (using docs in repo)
- [x] ✅ **Issues**: Enable (for bug reports and features)
- [ ] ❌ **Sponsorships**: Optional (can enable later)
- [ ] ❌ **Preserve this repository**: Not needed yet
- [ ] ❌ **Projects**: Not using GitHub Projects
- [x] ✅ **Discussions**: **Enable this** for community Q&A

### Pull Requests Section

Configure merge options:

- [x] ✅ **Allow merge commits**
- [x] ✅ **Allow squash merging** (default)
- [x] ✅ **Allow rebase merging**
- [x] ✅ **Always suggest updating pull request branches**
- [x] ✅ **Allow auto-merge**
- [x] ✅ **Automatically delete head branches**

## Step 2: Enable GitHub Pages

Navigate to: **Settings > Pages**

### Configuration

1. **Source**: Deploy from a branch
2. **Branch**: `main`
3. **Folder**: `/ (root)`
4. Click **Save**

### Custom Domain (Optional)

If you have a custom domain:

1. Enter domain name (e.g., `editor.yourdomaincom`)
2. Add DNS record as instructed
3. Wait for DNS check to pass
4. Enable HTTPS

### Verification

After a few minutes:

1. Visit: https://andrewparry.github.io/medit/
2. Verify the editor loads correctly
3. Test functionality

## Step 3: Branch Protection Rules

Navigate to: **Settings > Branches**

### Add Rule for `main` Branch

1. Click **Add rule** or **Add branch protection rule**
2. **Branch name pattern**: `main`

#### Configure Protection Rules:

**Require pull request before merging:**

- [x] ✅ **Require pull request reviews before merging**
    - Required approvals: 1
    - [ ] Dismiss stale pull request approvals when new commits are pushed
    - [ ] Require review from Code Owners (not set up yet)

**Require status checks before merging:**

- [x] ✅ **Require status checks to pass before merging**
    - [x] **Require branches to be up to date before merging**
    - Search and add required checks:
        - `CI` (from ci.yml workflow)
        - `Lint` (from lint.yml workflow)

**Other Settings:**

- [x] ✅ **Require conversation resolution before merging**
- [x] ✅ **Require signed commits** (optional but recommended)
- [ ] ❌ **Require linear history** (optional)
- [x] ✅ **Include administrators** (apply rules to admins too)
- [ ] ❌ **Allow force pushes** (keep disabled)
- [ ] ❌ **Allow deletions** (keep disabled)

3. Click **Create** or **Save changes**

## Step 4: Configure Issue Labels

Navigate to: **Issues > Labels**

### Default Labels to Keep

Keep these default labels:

- `bug` - Something isn't working
- `documentation` - Improvements or additions to documentation
- `duplicate` - This issue or pull request already exists
- `enhancement` - New feature or request
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `invalid` - This doesn't seem right
- `question` - Further information is requested
- `wontfix` - This will not be worked on

### Additional Labels to Create

Click **New label** for each:

1. **dependencies**
    - Color: `#0366d6` (blue)
    - Description: "Dependency updates"

2. **security**
    - Color: `#d73a4a` (red)
    - Description: "Security-related issue"

3. **performance**
    - Color: `#d4c5f9` (purple)
    - Description: "Performance improvements"

4. **accessibility**
    - Color: `#0075ca` (blue)
    - Description: "Accessibility improvements"

5. **triage**
    - Color: `#fbca04` (yellow)
    - Description: "Needs triage and categorization"

6. **testing**
    - Color: `#1d76db` (blue)
    - Description: "Related to testing"

## Step 5: Enable GitHub Discussions

Navigate to: **Settings > General > Features**

1. Check ✅ **Discussions**
2. Click **Set up discussions**

### Create Discussion Categories

Default categories are good, but you can customize:

1. **General** - General discussions about the project
2. **Ideas** - Share ideas for new features
3. **Q&A** - Ask the community for help
4. **Show and tell** - Show off your markdown documents!

## Step 6: Configure Code Security & Analysis

Navigate to: **Settings > Code security and analysis**

### Enable Features:

- [x] ✅ **Dependency graph** (should be enabled by default)
- [x] ✅ **Dependabot alerts** - Get alerted about vulnerable dependencies
- [x] ✅ **Dependabot security updates** - Auto-create PRs for security fixes
- [x] ✅ **Grouped security updates** - Group security updates into single PR

### Configure Dependabot

You already have `.github/dependabot.yml` configured, which will:

- Check npm dependencies weekly
- Check GitHub Actions weekly
- Auto-create PRs with dependency updates

## Step 7: Set Up Environments (for GitHub Pages)

Navigate to: **Settings > Environments**

If `github-pages` environment exists:

1. Click on it
2. Configure:
    - **Deployment branches**: Only `main` branch
    - Add environment secret if needed (usually not required)

If it doesn't exist yet, it will be created automatically when Pages workflow runs.

## Step 8: Configure Secrets and Variables (if needed)

Navigate to: **Settings > Secrets and variables > Actions**

Currently, no secrets are needed. Future additions might include:

- Code coverage service tokens (Codecov)
- Deployment keys
- API keys for services

## Step 9: Repository Insights

Navigate to: **Insights > Community**

Check the community standards:

- [x] Description: ✅
- [x] README: ✅
- [x] Code of conduct: ✅
- [x] Contributing: ✅
- [x] License: ✅
- [x] Security policy: ✅
- [x] Issue templates: ✅
- [x] Pull request template: ✅

All should be green checkmarks!

## Step 10: Set Up Repository Social Preview

Navigate to: **Settings > General** (scroll to bottom)

### Social Preview Image

Create an Open Graph image (1280x640 pixels) showing:

- Project logo/icon
- "Markdown Editor" title
- Key features or screenshot
- Clean, professional design

Upload:

1. Scroll to **Social preview** section
2. Click **Edit**
3. Upload your image
4. Click **Save**

This image will be shown when the repo is shared on social media.

## Step 11: Configure Webhooks (Optional)

Navigate to: **Settings > Webhooks**

Add webhooks for:

- Slack/Discord notifications
- CI/CD systems
- Analytics platforms

Not required for initial launch.

## Step 12: Insights & Analytics

### Enable Traffic Stats

Navigate to: **Insights > Traffic**

This shows:

- Views (visitors to your repo)
- Clones (git clone operations)
- Referring sites
- Popular content

Data updates daily.

## Verification Checklist

After completing setup, verify:

- [ ] Repository description and website are visible
- [ ] Topics/tags are displayed
- [ ] GitHub Pages is live and working
- [ ] Discussions are enabled
- [ ] Branch protection is active (try to push to main directly - should fail)
- [ ] Issue templates appear when creating new issue
- [ ] PR template appears when creating new PR
- [ ] Dependabot is scheduled (check Actions tab)
- [ ] CI/CD workflows run on push (check Actions tab)
- [ ] All community health files show in Insights > Community

## Post-Setup Tasks

1. **Create Initial Discussion**
    - Welcome message in General
    - Ask for feedback

2. **Pin Important Issues**
    - Roadmap issue
    - Known issues
    - Feature requests

3. **Create GitHub Project (Optional)**
    - For release planning
    - Feature tracking

4. **Set Up GitHub Sponsors (Optional)**
    - If accepting donations
    - Link to sponsor page

## Common Issues & Solutions

### Pages Not Deploying

- Check Actions tab for deployment errors
- Verify branch and folder settings
- Check if index.html exists in root
- Wait 5-10 minutes for first deployment

### CI/CD Not Running

- Check workflow files syntax (.github/workflows/\*.yml)
- Verify branch names in workflow triggers
- Check Actions tab for error messages

### Branch Protection Not Working

- Verify you're not an admin (or "Include administrators" is checked)
- Check that status checks exist (need at least one workflow run)
- Ensure check names match exactly

## Resources

- [GitHub Docs: Managing repositories](https://docs.github.com/en/repositories)
- [GitHub Pages documentation](https://docs.github.com/en/pages)
- [GitHub Actions documentation](https://docs.github.com/en/actions)
- [Dependabot documentation](https://docs.github.com/en/code-security/dependabot)

---

**Setup Status**: ✅ Ready for configuration  
**Last Updated**: November 5, 2024
