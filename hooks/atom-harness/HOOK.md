---
name: atom-harness
description: "Atom task harness hooks: inject safety rules on bootstrap"
metadata:
  openclaw:
    emoji: "🧩"
    events: ["agent:bootstrap"]
---

# Atom Harness

在 agent bootstrap 阶段注入 atom 任务的安全约束。

## 作用

- 所有 agent 启动时，注入危险操作拦截规则
- 阻止 executor 模型自行执行 `attrib -r` / `chmod` / `sudo` 等越权命令
- 注入编码安全规则：所有文件读写必须指定 UTF-8 No BOM
- 注入前提检查规则：写文件前必须检查文件存在性和权限

## 原理

`agent:bootstrap` 事件可以修改 `event.context.bootstrapFiles` 数组来注入额外的系统提示文件。

注入 `SAFETY.md` 作为安全约束系统提示。
