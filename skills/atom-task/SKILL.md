---
name: "atom-task"
description: "Decompose tasks into atomic units, route to appropriate executor (DeepSeek/atomcode), verify, synthesize."
---

# Atom Task v2.0

Multi-executor task system: **decompose → route → execute → verify → synthesize → log**.

## 执行器模型

| 执行器 | 适用场景 | 调用方式 |
|--------|---------|---------|
| **DeepSeek**（默认） | 文本分析、逻辑推理、翻译、摘要 | `sessions_spawn` isolated |
| **atomcode**（-p 模式） | 编程任务、写代码、调试、文件操作 | `atomcode -p "指令" -C 目录 --max-turns N` |

路由规则：
- 编程/代码类 → atomcode（它有完整的 coding toolchain）
- 文本/逻辑类 → DeepSeek（不用模型切换）
- 混合任务 → decompose 时标注 type，路由到对应执行器

## 铁律

### 1. 执行器自动路由
- decompose 时根据任务类型分配 executor
- 编程任务标注 `executor: "atomcode"`，文本任务 `executor: "default"`
- 执行阶段不需要人工干预

### 2. 上下文压缩
- 每个 atom spawn 必须是 isolated context
- instruction 自包含，不含主会话历史

### 3. Verify 不可信 self-report
- post-action probe 机械验证实际结果
- atomcode 的输出和 DeepSeek 的输出都同样验证

### 4. 越权操作 hooks 拦截
- atom-harness 插件拦截危险命令（attrib -r / chmod / sudo）

## Loop Contract

```
User Task
    ↓
1. DECOMPOSE (DeepSeek) → AtomTask[] JSON
   每个 atom 标注 executor: "default" | "atomcode"
    ↓
2. ROUTE — 根据 executor 分发
    ├─ default → sessions_spawn({ model: "default", context: "isolated" })
    └─ atomcode → exec { atomcode -p "instruction" -C dir --max-turns 5 }
    ↓
3. EXECUTE × N 并行
    ↓
4. VERIFY — post-action probe
    ↓ (有失败)
4b. REPAIR — 同一执行器重试，或升级到 DeepSeek
    ↓
5. SYNTHESIZE (DeepSeek)
    ↓
6. LOG
```

## Data Types

### AtomTask v2

```json5
{
  "id": "atom-1",
  "type": "code" | "text" | "file_operation",
  "executor": "default" | "atomcode",  // ⭐ v2.0 新增
  "instruction": "自包含指令",
  "input": {},
  "verify_rules": ["probe:..."],
  "max_turns": 5,          // atomcode 的 --max-turns
  "work_dir": "路径"        // atomcode 的 -C
}
```

### AtomResult

```json5
{
  "id": "atom-1",
  "executor": "atomcode",
  "status": "pass" | "fail",
  "output": "atomcode 的 stdout+stderr",
  "probe_results": { "all_pass": true, "details": [] },
  "stats": { "time_ms": 15000, "turns": 3 }
}
```

## Decompose 模板

```
你是任务分解器。将以下任务拆为原子子任务。

对每个子任务判断执行器：
- 编程/写代码/调试/文件操作 → executor: "atomcode"
- 文本分析/逻辑推理/翻译/摘要 → executor: "default"

约束：
1. instruction 自包含，isolated 执行
2. 输出可用机械规则验证
3. 原子互相独立

输出 JSON Array:
[{ "id", "type", "executor", "instruction", "input", "verify_rules", "max_turns", "work_dir" }]
```

## Route & Execute

```javascript
for (const atom of atoms) {
  let result;
  if (atom.executor === "atomcode") {
    // atomcode 执行编程任务
    const cmd = `atomcode -p "${atom.instruction}" -C "${atom.work_dir}" --max-turns ${atom.max_turns}`;
    result = await exec(cmd);
  } else {
    // DeepSeek 执行文本任务
    result = await sessions_spawn({
      task: atom.instruction,
      context: "isolated",
    });
  }
  results.push(result);
}
```

## Verify

post-action probe 对两种执行器都同样生效：

| probe | 用途 | 示例 |
|-------|------|------|
| `probe:file_contains X` | 文件内容含 X | `probe:file_contains function` |
| `probe:no_occurrence X` | 文件不含 X | `probe:no_occurrence XXX` |
| `probe:file_exists` | 文件存在 | `probe:file_exists` |
| `probe:exec cmd` | 命令验证 | `probe:exec node test.js` |
| `probe:encoding UTF-8` | 编码验证 | `probe:encoding UTF-8` |

## Synthesize

```
以下是一组原子执行结果（含 probe 验证报告）：

{JSON.stringify(results.map(r => ({
  id: r.id, executor: r.executor, status: r.status,
  output_摘要: r.output.slice(0, 500),
  probe: r.probe_results
})))}

合并为最终答案。失败的 atom 降级标记。
```
