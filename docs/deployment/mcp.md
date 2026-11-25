# MCP deployment configuration

Set `MCP_RESOURCE_URL` to the exact externally reachable MCP endpoint and configure the same URL as a Clerk MCP resource. HTTPS is required except for `http://localhost` and `http://127.0.0.1` during local development. The URL must end in `/mcp` and cannot contain credentials, a query string, or a fragment. If it is missing or invalid, the endpoint returns 503.
