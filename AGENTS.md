# Agent Guidelines for Lemon Calendarium / Project Lenta

## Browser Manipulation
- **Do not use browser manipulation or browser subagents (`browser_subagent`)**. Browser automation is currently disabled / not working in this environment.
- Validate web applications using TypeScript build checks (`npm run build`), API verification requests (`read_url_content`), and code inspections.
