# Atom Task

A single-loop task system: **decompose → execute → verify → synthesize → log**.

核心思想：单模型 + 上下文压缩。每个原子在隔离的上下文中执行，不继承主会话历史。

## 铁律

- **单模型**: decompose / execute / synthesize 全部同一模型，没有模型切换
- **上下文压缩**: 每个 atom spawn 必须是 isolated context，instruction 自包含
- **Verify 不可信 self-report**: 必须用 post-action probe 机械验证实际结果
- **操作前先验证前提**: 文件操作前必须检查存在性、权限、占用
- **越权操作 hooks 拦截**: attrib -r / chmod / sudo 等必须走 hooks 确认

## 结构

```
skills/atom-task/SKILL.md    — 技能定义
hooks/atom-harness/          — HOOK: bootstrap 注入安全规则
  ├── HOOK.md
  ├── handler.ts
  └── scripts/SAFETY.md
plugins/                     — 插件: before_tool_call 拦截危险操作
  ├── package.json
  └── plugin.mjs
README.md
```

## 循环流程

```
User Task
  ↓
1. DECOMPOSE → AtomTask[] JSON
2. EXECUTE × N isolated spawn
3. VERIFY — post-action probe 验证实际结果
4. SYNTHESIZE
5. LOG
```

## v2.0 — Multi-Executor

| 执行器 | 适用场景 |
|--------|---------|
| DeepSeek (default) | 文本分析、逻辑推理、翻译、摘要 |
| atomcode (-p) | 编程任务、代码编写、调试、文件操作 |

atomcode 通过 `atomcode -p "task" -C dir --max-turns N` 非交互模式调用，作为 coding executor。
