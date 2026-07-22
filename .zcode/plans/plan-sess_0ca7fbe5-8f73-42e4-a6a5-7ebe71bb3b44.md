# CPEC-CT 前端设计全面整改方案

方向：修复所有确认的功能性 bug 和可访问性问题、清理死代码、统一设计体系，并在**保持极简黑白灰**的前提下做整体精致化（靠阴影层次、间距、圆角、细节质感，不加新颜色）。

---

## 一、功能性 Bug 修复（最优先）

1. **手机端侧边抽屉定位失效**（`globals.css:573` 的 `.app-sidebar` 覆盖了抽屉的 `fixed`/`w-64`/`transition-transform`）
   - 把 `.app-sidebar` 的基础样式收敛到桌面端（媒体查询包裹），抽屉改用独立的 `.app-drawer` 类，恢复固定定位 + 滑动动画；同时补 Esc 键关闭、`role="dialog"`、`aria-modal`
2. **手机键盘弹出挡住输入框**：删除 `ai.css:3-4` 的局部 `--app-height` 声明，让 `Composer.js` 写入的键盘感知高度真正生效
3. **AI 页侧边栏宽度错位**：`ai.css:139` 网格轨道 280px vs `Sidebar.js` 的 320px，统一为一个值
4. **聊天面板高度魔法数**：`ChatLayout.js:88` 的 `calc(var(--app-height)-8.5rem)` 在不同屏幕留白/溢出，改为按断点修正的稳妥算法
5. **手机端会话操作（置顶/重命名/删除）完全点不到**（仅 hover 显示）：移动端常显「···」按钮
6. **声音库预览输入框串数据**：`my-voices/page.tsx` 所有卡片共享一个预览文本 state，改为每张卡独立
7. **消息操作按钮触屏不可见**：流式结束后的最新消息操作区改为低透明度常显

## 二、暗色模式 Bug 修复

8. `ai.css:2` 锁定 `--muted-foreground` 导致暗色下灰字太暗 → 暗色块补覆盖或直接删除
9. 信息来源（Citations）和编辑态取消按钮 hover 误用文字色当背景，暗色下反色不可读 → 改用面板色
10. 思考块普通步骤 hover 变"错误红"（`ThinkingBlock.js:242`）→ 改中性色；进行态徽章的红色边框同样改中性
11. 字幕识别页 Switch 关闭态纯黑滑块刺眼 → 改用 `--oa-paper` + 边框
12. 确认弹窗遮罩 `bg-black/20` 暗色下无压暗效果 → 暗色加深

## 三、可访问性修复

13. Input 焦点环在暗色下不可见 → 统一用已定义的 `--oa-control-focus-shadow`
14. 侧边栏分组标题等小字对比度不达标（2.4:1）→ 浅色 `#a3a3a3`→`#737373`，暗色反向提升
15. ConfirmModal 加 `role="alertdialog"`；危险操作按 Enter 不再直接确认；关闭按钮补 `aria-label`
16. 偏小的触控目标（汉堡按钮、折叠手柄等）适当放大

## 四、死代码清理

17. `globals.css`：删除 16 个 calendar 变量（明暗两套）、彩色时代遗留的别名变量层、未使用的渐变/阴影/水印变量、重复的 `oaFadeSlideUp` 关键帧、`.toolbar`/`.auth-form` 等死类
18. `ai.css`：删除未使用的 `--glass-*`/`--ai-shadow*`/`--code-bg` 变量、被禁用的 `.ai-glow` 残留；`.prose`/`.text-size-*`/`.toast-*` 等全局选择器收敛到 `.ai-shell` 作用域下，防止泄漏到其他页面
19. 组件中失效的 Tailwind 类清理：`prose-sm`/`prose-invert` 等（项目没装 typography 插件，全是死类）、`md:px-8` 等重复类
20. `app/layout.tsx` 手写 `<meta viewport>` 改为 Next 16 标准的 `export const viewport`，并补 `themeColor` 跟随主题
21. 收敛暗色标记：`[data-theme="dark"]` 死选择器删除

## 五、视觉统一（体系层面）

22. **分段控件激活态不可见**（媒体页生成/编辑切换，容器和激活按钮同为 #fafafa）→ 激活态用 `--oa-elevated` + 轻微阴影
23. **阴影层次恢复**：全站把阴影都设成了 none，浮层和页面"糊成一片" → 卡片 hover 给 `shadow-sm`、浮层/弹窗给 `shadow-lg`，暗色下同步
24. **圆角阶梯统一**：容器 12px / 卡片内元素 8px / 小控件 6-8px；修复 BrandMark 三处圆角打架（globals 的 `.brand-mark` 删掉 border-radius，由调用方控制）
25. **图标尺寸统一**：主侧边栏被 CSS 强制 16px、分区侧边栏 20px → 统一
26. **动画时长统一**：收敛到 `--transition` 一个令牌；删除重复入场动画，两种页面布局入场效果对齐
27. **表单控件统一**：全站 select/textarea 存在三种高度两种底色 → 统一为一套样式
28. AI 页与全局**滚动条宽度统一**（4px vs 6px）

## 六、美化（黑白灰精致化）

29. **AI 聊天页空状态**（用户进 /ai 的第一屏，现在是纯白）→ 品牌 Logo + 引导语 + 3-4 个示例提问卡片，点击直接填入输入框
30. **登录页太裸** → 加极低透明度（3-5%）的网格/渐变光斑背景装饰，登录卡片加阴影从背景浮起
31. **设置页** → 加 `max-w-3xl` 居中约束，头像首字母块放大做视觉重心
32. **AI 气泡对比度提升**：亮色下气泡底色和页面底色几乎一样 → 气泡改 `--oa-elevated` + 细边框
33. **输入区"卡片套卡片"三层边框** → 去掉内层输入框边框
34. **历史/声音列表页加统一页头**（标题 + 数量 + 刷新按钮带 aria-label），替换现在孤零零的一个图标
35. **顶栏面包屑中间层级展示**（如"语音合成 / 生成历史"），手机端顶栏 padding 从 32px 缩到 16px
36. **生成按钮加载态统一**：全部加旋转 spinner；结果卡片下载入口统一为带 Download 图标的按钮；结果出现时用已有的 `fade-in-up` 动画入场
37. **代码块背景变量化**：修复亮色/暗色下三处不一致的代码块底色
38. AI 侧边栏"暂无会话"空状态对齐全站 EmptyState 风格（图标 + 引导文案）
39. 字体栈修正：Inter 声明了但从未加载，从字体栈中移除，统一两处回退链（中文走苹方/微软雅黑系统栈）

---

## 涉及文件

- 样式：`app/globals.css`、`app/ai/ai.css`、`tailwind.config.ts`
- 布局组件：`app-sidebar.tsx`、`topbar.tsx`、`console-shell.tsx`、`nav-links.tsx`、`confirm-modal.tsx`、`input.tsx`、`slider.tsx`、`badge.tsx`、`brand-logo.tsx`、`route-loading.tsx`
- AI 聊天：`ChatLayout.js`、`Sidebar.js`、`Composer.js`、`MessageList.js`、`MessageListHelpers.js`、`ThinkingBlock.js`、`Markdown.js`、`ModelSelector.js`
- 页面：登录页、设置页、`media/image`、`media/video`、`speech/*`、`transcribe/*`、`my-voices`
- 布局：`app/layout.tsx`

## 说明

- 全部改动都在前端样式和组件层，不动后端 API 和业务逻辑
- 按规则：死代码直接删除、不写任何兼容/兜底逻辑
- 本地没有运行环境，改完后建议在 Zeabur 部署后重点验证：手机端抽屉滑出动画、手机键盘弹出时输入框可见、暗色模式下各页面切换、AI 页空状态首屏
