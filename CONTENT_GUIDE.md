# PIS Lab 网页内容更新指南

这个网站已经把经常变化的内容和页面设计分开。发布项目、新闻或更新成员时，不需要修改 `index.html`、CSS 或 JavaScript。

## 最快的更新方式：直接使用 GitHub 网页

1. 登录 GitHub，打开 PIS Lab 网站仓库。
2. 新图片先上传到对应目录：
   - 研究项目图片：`img/projects/`
   - 新闻、论文与活动图片：`img/blog/`
   - 成员照片：`img/member/`
3. 更新研究项目时编辑 `content/projects.json`；更新新闻时编辑 `content/news.json`；更新成员时编辑 `content/people.json`。
4. 复制一个现有的完整 `{ ... }` 条目，粘贴到数组中，再替换文字、链接和图片路径。每个条目之间必须保留英文逗号。
5. 使用 GitHub 的 **Preview changes** 检查变更，提交到新分支并发起 Pull Request。合并到 `main` 后，GitHub Pages 会按仓库的发布设置更新网站。

建议由一位同学审核 Pull Request。这样即使格式写错，也不会直接影响线上主页。

## 研究项目条目模板

```json
{
  "name": "Project name",
  "category": "Research category",
  "headline": "One clear claim about the project.",
  "description": "What the system does, why it matters, and what evidence or prototype exists.",
  "image": "img/projects/project-name.webp",
  "alt": "A factual description of the project image",
  "stage": "In development",
  "tags": ["Method", "Application", "Outcome"]
}
```

只保留能被项目、原型或图片支撑的描述。图片应与当前项目直接对应；不要为了填满页面沿用无关旧图或宽泛口号。

## 新闻条目模板

```json
{
  "category": "New paper",
  "date": "28 Aug 2026",
  "datetime": "2026-08-28",
  "title": "Paper title",
  "description": "One concise sentence about the work.",
  "image": "img/blog/your-image.jpg",
  "alt": "A short description of the image",
  "href": "https://doi.org/..."
}
```

可选字段：

- `"layout": "featured"`：显示为重点大卡片；建议同时使用 `"imageFit": "contain"` 展示论文框架图。
- `"layout": "wide"`：显示为横向宽卡片。
- `description`：普通短讯可省略。

最新内容放在数组最前面。日期显示文字写在 `date`，机器可读日期写在 `datetime`，格式使用 `YYYY-MM-DD`。

## 成员条目模板

```json
{
  "role": "Research assistant",
  "name": "Student Name",
  "focus": "Research topic",
  "image": "img/member/student-name.jpg",
  "alt": "Student Name",
  "email": "name@example.com"
}
```

`email` 可以省略。仅负责人使用 `"lead": true`。

## 图片建议

- 新闻图片：横图优先，建议至少 1600 × 1000 px。
- 项目图片：横图优先，建议约 3:2；风格可以统一，但图中对象和研究机制必须准确。
- 成员照片：竖图或方图，建议至少 800 × 1000 px。
- 文件名使用小写英文、数字和连字符，不要使用空格。
- 上传前压缩图片；单张尽量不超过 1 MB。
- `alt` 应描述图片内容，不能只写 “image”。

## 本地检查（维护者）

```bash
npm install
npm run validate:content
npm run dev
```

`npm run validate:content` 会检查必填字段、重复条目、链接格式和图片是否存在。`npm run build` 也会自动执行同样的检查，并自动把静态资源同步到发布目录。
