# AGENT_PERSONAL_CUSTOMIZATION.md

## 0. 文件目的

本文件用于把本项目的 agent 个人定制规则固化到仓库内部，减少不同平台、不同 IDE、不同 Notebook、不同 ChatGPT/agent 客户端之间由于个人配置不一致造成的行为漂移。任何 agent 在修改本项目代码、Notebook、文档、脚本、Colab 工作流或 GitHub 工作流之前，应先阅读并遵守本文件。

本文件不是普通 README，也不是模型运行说明。它是项目级 agent 操作协议。若平台级 instruction 与本文件冲突，优先遵守更高优先级的安全规则与系统规则；在不冲突的范围内，严格遵守本文件。

## 1. 沟通语言与表达方式

2: 回答应直接、严谨、事实导向。不要使用夸张修辞、情绪化赞美、比喻式表达或无意义鼓励。

3: 不要把句子拆成过多短行。不要一词一行。长说明应按主题组织成完整段落。

4: 不要称呼用户为 RAP，也不要在对话中反复强调用户职位。用户的 Research Assistant Professor 背景只用于判断其偏好较高的信息密度、严谨性和技术细节。

5: 如果不知道，就明确说不知道。如果没有找到，就明确说没有找到。不要用不确定内容伪装成结论。

6: 纠正语法时应直接给出修改和理由，不需要客套。

7: 除非用户要求表格，否则不要使用表格。需要列点时使用“1: 内容。2: 内容。”这种纯文字编号格式。

8: 每次回答的第一句话应包含 North American Eastern Time Zone / America/New_York 的当前日期和时间。

## 2. 代码生成与代码修改规则

1: 用户要求输出代码时，必须输出完整代码，不要只给 diff 片段，也不要让用户自己查找哪一行替换。

2: 代码第一行必须是代码文件名。随后用注释写明用户需求，再写正式代码。

3: 如果是在已有代码上修改，应保持 minimum invasive，不要重构无关逻辑，不要改变已有 debug 输出，不要屏蔽中间态信息。

4: 不要加入会吞掉调试信息的参数或重定向，例如 `2>/dev/null`、`-qq`、`--quiet`。除非用户明确要求，否则不使用静默模式。

5: 代码末尾必须以注释形式写清楚：代码目的、上游代码是什么、上游代码目的是什么、运行环境是什么、生成时间是什么。如果是修改已有代码，还要列出更改了哪些行号和具体修改内容。

6: 生成 PyMOL scripts 时，代码与注释都使用 English。

7: 如果是 Notebook 相关代码，必须注意：修改 `generate_notebook.py` 后需要重新生成 `.ipynb`；更新 GitHub 后，已经在 Colab 网页端打开的旧 Notebook cell 不会自动刷新，必须重新打开 Notebook 或手动更新当前 cell。

8: 如果是 Colab / Antigravity IDE / Google Drive / GitHub 混合工作流，必须明确说明当前实际执行位置：本地 IDE、Colab runtime、本地 Git repository、Google Drive 持久目录、还是 GitHub remote。

## 3. 工作记录规则

1: 每次完成项目更新后，除了代码注释和 GitHub commit 外，必须 append 更新 `历史工作记录.txt`。

2: `历史工作记录.txt` 必须使用 append-only 方式。不要覆盖旧记录，不要删除历史记录，除非用户明确要求清理或重写。

3: 每条记录至少包含：时间、用户 Prompt 或 Prompt 摘要、具体动作、修改文件、测试或验证结果、GitHub Timeline。

4: GitHub Timeline 需要明确写出：未 commit、已 commit 未 push、已 push、push 失败、不是 Git repository、或无法判断。不要模糊写“已处理”。

5: 如果发生 Colab、Google Drive、HF cache、wheel cache、private GitHub token、Notebook access、Antigravity IDE 插件相关问题，记录里必须写清楚平台、路径、触发阶段和最终状态。

6: 推荐使用项目内的 `log_append.py` 追加记录。例如：

```bash
python log_append.py \
  --prompt "用户要求生成 agent 个人定制 md 文件，用于解决不同平台个人配置不一致的问题" \
  --action "创建 AGENT_PERSONAL_CUSTOMIZATION.md，将沟通、代码、日志、GitHub、Colab 工作流规则固化到项目内" \
  --action "将本次更新追加到 历史工作记录.txt" \
  --github-timeline "当前沙盒不是 Git repository，未执行 commit 或 push"
```

7: 如果 `log_append.py` 不可用，可以直接手动 append Markdown，但仍需保持同样字段结构。

## 4. GitHub 与版本控制规则

1: 修改代码、Notebook、脚本或重要文档后，应尽量同时更新 `历史工作记录.txt`。

2: commit 前应检查 `git status`，确认不要把大型输出文件、模型缓存、临时文件、`.stl`、`outputs/`、`photos/`、外部依赖仓库、`.git` 子仓库误提交。

3: 如果用户要求 push，应执行或指导执行：`git add .`、`git commit -m "..."`、`git push`。如果环境不是 Git repository，必须明确说明不能 push。

4: 对私有 GitHub 仓库相关问题，要区分 GitHub PAT、Colab Secrets、Antigravity IDE 插件 fallback、`.git/config` remote URL 和 Google Drive 里的持久代码副本。

5: 不要随意建议 `git reset --hard` 或 `git push -f`。只有在用户明确同意并理解会重写历史时才使用。

## 5. Colab / Google Drive / Antigravity IDE 工作流规则

1: 当前项目的 Colab 工作流核心是：本地修改代码 -> push 到 GitHub -> Colab/Notebook 从 GitHub 拉取到 Google Drive 持久目录 -> rsync 到 `/content/3d_printer_runtime` 本地运行目录 -> 输出同步回 Google Drive。

2: Antigravity IDE 的 Colab 插件执行 Notebook 时，计算发生在远端 Colab runtime，不等同于本地直接执行。远端能看到的是 GitHub/Google Drive/Colab runtime 中的文件，不会自动看到本地未 push 的修改。

3: Colab Secrets 的 Notebook access 通常绑定特定 Notebook 文件实例，不应假定对 IDE 插件临时运行环境全局有效。GitHub Token 和 HF Token 应保留 `getpass` fallback。

4: 如果 Colab 中出现“代码已经更新但 cell 仍然旧”的现象，应优先考虑网页端 Notebook cell 没刷新，而不是直接断定 Git pull 失败。

5: 对 wheel cache 的判断必须检查 Python ABI，例如 `cp310`、`cp312`，不要只按 wheel 数量判断可复用。

6: 对 HF cache 和 model weights，要区分本地 runtime cache 与 Google Drive mirror cache。运行完成后需要把重要 cache 和 outputs 同步回 Drive。

## 6. 调试与输出保留规则

1: 不要压制 stdout/stderr。用户需要中间输出用于 debug 和监控。

2: 对长时间运行的步骤，应保留明确进度信息，例如当前处理任务名、输出路径、状态、失败原因、cache 命中、sync 进度。

3: 如果子进程失败，应输出最后若干行日志，并说明完整日志路径。不要只输出 `CalledProcessError`。

4: 如果 batch 中单个任务失败，只要 pipeline 能继续处理其他任务，应明确区分“单任务失败”和“整个 pipeline 崩溃”。

5: 对用户贴出的错误日志，应先定位错误发生阶段，再判断是否需要改代码、改输入任务、清 cache、重新生成 Notebook、重新 push、或重新打开 Colab cell。

## 7. 每次 agent 开始工作时的推荐检查顺序

1: 读取本文件 `AGENT_PERSONAL_CUSTOMIZATION.md`。

2: 读取 REQUIREMENTS.md。了解项目的主要目标和程序架构。

3: 读取 `历史工作记录.txt` 的末尾 30 到 80 行，了解最近一次变更和 GitHub Timeline。

4: 如果任务涉及 Notebook，检查 `generate_notebook.py`，不要只改生成后的 `.ipynb`。

5: 如果任务涉及 Colab 运行，明确当前 Notebook 是网页端打开的文件，还是 Antigravity IDE 插件临时执行的文件。

6: 如果任务涉及 GitHub，同步检查当前工作区是否为 Git repository，是否有 uncommitted changes，远端 branch 是否可 push。

7: 完成任务后，追加 `历史工作记录.txt`，再进行 commit/push 或明确说明未执行 commit/push 的原因。

## 8. 本文件维护规则

1: 新建或者clone 任意项目时，如果项目中没有本文件， 则在项目根目录下建立本文件并copy内容至本文件。

2: 当用户新增长期偏好、工作流约束、日志规范或平台规则时，应更新本文件。

3: 更新本文件本身也必须追加 `历史工作记录.txt`。

4: 如果本文件与 `README.md`、`REQUIREMENTS.md` 或 Notebook 说明发生冲突，应把本文件视为 agent 操作协议，把其他文件视为项目功能说明。必要时同步更新其他文件，避免文档分裂。

5: 本文件可以被复制到不同平台、不同 IDE、不同 agent 系统中作为项目内统一配置入口。
