# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Markdown Editor seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please Do Not

- **Do not** open a public GitHub issue for a suspected security vulnerability.
- **Do not** publicly disclose the vulnerability before it has been addressed.

### Please Do

1. **Report via GitHub Security Advisories** (Preferred)
    - Go to the [Security tab](https://github.com/andrewparry/medit/security) of this repository
    - Click "Report a vulnerability"
    - Fill out the form with details about the vulnerability

2. **Report via GitHub Issues** (Alternative)
    - If you cannot use Security Advisories, create a private issue
    - Tag it with the "security" label
    - Provide as much information as possible

### What to Include in Your Report

Please include the following information in your report:

- **Type of vulnerability** (e.g., XSS, CSRF, injection)
- **Full paths of source file(s)** related to the vulnerability
- **Location of the affected source code** (tag/branch/commit or direct URL)
- **Step-by-step instructions** to reproduce the issue
- **Proof-of-concept or exploit code** (if possible)
- **Impact of the vulnerability**, including how an attacker might exploit it

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 48 hours
- **Updates**: We will keep you informed about the progress of fixing the vulnerability
- **Disclosure**: We will notify you when the vulnerability is fixed
- **Credit**: We will give you credit for the discovery (unless you prefer to remain anonymous)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Target**: Within 30 days for critical vulnerabilities, 90 days for others

## Security Best Practices for Users

### General Usage

1. **Keep Your Browser Updated**
    - Use the latest version of Chrome, Firefox, Safari, or Edge
    - Enable automatic browser updates

2. **Be Cautious with File Sources**
    - Only open markdown files from trusted sources
    - Be aware that malicious markdown files could contain harmful content

3. **Review Permissions**
    - The editor requests file system access when saving/opening files
    - Always review what permissions you grant

### Data Privacy

1. **Local Storage**
    - Auto-save uses browser's localStorage
    - Data stays on your device
    - Clear browser data to remove saved content

2. **Pure Client-Side - No Server Communication**
    - The editor is 100% client-side - no backend required
    - Works entirely offline once loaded
    - No data is transmitted to any servers
    - No analytics or tracking is performed
    - All file operations happen locally in your browser

### Known Security Measures

This editor implements several security measures:

1. **XSS Protection**
    - HTML content is sanitized before rendering
    - Preview uses a secure sanitizer (`sanitizer.js`)
    - User input is properly escaped

2. **Content Security Policy**
    - Consider using CSP headers when self-hosting
    - Restrict inline script execution

3. **File Type Validation**
    - Only markdown files (.md, .markdown) are accepted
    - File content is validated before processing

## Security Disclosure Process

When a security vulnerability is reported:

1. **Triage**: We assess the severity and impact
2. **Fix**: We develop and test a patch
3. **Release**: We release a security update
4. **Disclosure**: We publish a security advisory
5. **Credit**: We acknowledge the reporter (if they wish)

## Security Updates

Security updates will be released as patch versions (e.g., 1.0.1) and will be clearly marked in:

- GitHub Releases
- CHANGELOG.md
- Security Advisories

Subscribe to this repository to receive notifications about security updates.

## Security Hardening Recommendations

If you're self-hosting or deploying this editor:

### Content Security Policy Headers

```
Content-Security-Policy:
    default-src 'self';
    script-src 'self' https://cdnjs.cloudflare.com;
    style-src 'self' https://cdnjs.cloudflare.com 'unsafe-inline';
    img-src 'self' data: https:;
```

### Additional Headers

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

### HTTPS Only

- Always serve the editor over HTTPS in production
- Use HSTS (HTTP Strict Transport Security)

## Acknowledgments

We would like to thank the following individuals for responsibly disclosing security vulnerabilities:

- (List will be updated as vulnerabilities are reported and fixed)

## Contact

For security-related questions or concerns:

- **GitHub Issues**: https://github.com/andrewparry/medit/issues
- **Security Advisories**: https://github.com/andrewparry/medit/security

---

Thank you for helping keep Markdown Editor and its users safe!
