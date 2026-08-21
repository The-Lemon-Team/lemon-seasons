# Browser Manipulation Rule

Do not use browser manipulation tools (such as `browser_subagent` or `open_browser_url`) as the browser automation service / CDP port is currently unavailable in this environment.
Verify frontend and backend functionality using API calls (`read_url_content`), CLI builds (`npm run build`), unit/integration tests, and source inspections instead.
