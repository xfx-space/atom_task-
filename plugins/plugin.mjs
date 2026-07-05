// Atom Harness Plugin — before_tool_call hook
// Intercepts exec tool calls with dangerous command patterns
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

// Dangerous command patterns that require confirmation
const DANGEROUS_PATTERNS = [
  { regex: /attrib\s+[-+][ra]/i, reason: "修改文件只读属性", severity: "high" },
  { regex: /chmod|chown|icacls|cacls/i, reason: "修改文件权限", severity: "high" },
  { regex: /sudo|runas/i, reason: "提权操作", severity: "critical" },
  { regex: /reg\s+(delete|add|copy)/i, reason: "修改注册表", severity: "critical" },
  { regex: /Set-Content(?!.*-Encoding)/i, reason: "默认编码写入（缺少 -Encoding）", severity: "warning" },
  { regex: /Out-File(?!.*-Encoding)/i, reason: "默认编码写入（缺少 -Encoding）", severity: "warning" },
];

export default definePluginEntry({
  id: "atom-harness",
  name: "Atom Harness",
  description: "Intercepts dangerous exec commands in atom task execution",

  register(api) {
    // ── before_tool_call: intercept exec with dangerous patterns ──
    api.on(
      "before_tool_call",
      async (event) => {
        // Only intercept exec tool calls
        if (event.toolName !== "exec") {
          return;
        }

        const command = String(event.params.command ?? "");
        if (!command) {
          return;
        }

        // Check against dangerous patterns
        for (const pattern of DANGEROUS_PATTERNS) {
          if (pattern.regex.test(command)) {
            return {
              requireApproval: {
                title: `[Atom Harness] 拦截：${pattern.reason}`,
                description: `命令: ${command.slice(0, 200)}
严重程度: ${pattern.severity}
建议: 请确认是否允许此操作。`,
                severity: pattern.severity === "critical" ? "error" : "warning",
                timeoutMs: 30_000,
                timeoutBehavior: "deny",
              },
            };
          }
        }
      },
      { priority: 90 }
    );

    // ── after_tool_call: audit exec results ──
    api.on(
      "after_tool_call",
      async (event) => {
        if (event.toolName !== "exec") {
          return;
        }

        // Log completed exec for audit
        const command = String(event.params.command ?? "").slice(0, 100);
        const exitCode = event.result?.exitCode ?? -1;
        console.log(`[atom-harness] exec complete: ${command} → exit ${exitCode}`);
      },
      { priority: 50 }
    );
  },
});
