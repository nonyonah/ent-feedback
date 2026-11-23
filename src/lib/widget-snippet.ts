export function widgetSnippet(origin: string, projectKey: string, board: string) {
  const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return `<script src="${escape(origin)}/widget.js" data-project="${escape(projectKey)}" data-board="${escape(board)}" defer></script>`;
}
