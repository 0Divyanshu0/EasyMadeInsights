# 📊 EasyMadeInsights — Data Insights Made Simple

<div align="center">

![EasyMadeInsights Logo](public/easy-made-insights-logo.png)

**Transform raw Excel data into actionable business insights with AI-powered analytics**

[![Version](https://img.shields.io/badge/version-Beta%20v0.1-blue.svg)](https://github.com/yourusername/EasyMadeInsights)
[![React](https://img.shields.io/badge/React-19.2.0-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-Active%20Development-brightgreen.svg)]()

[🚀 Live Demo](https://easymadeinsights.web.app) • [📖 Documentation](#-documentation) • [🐛 Report Bug](https://github.com/yourusername/EasyMadeInsights/issues) • [💡 Request Feature](https://github.com/yourusername/EasyMadeInsights/issues)

</div>

---

## 🌟 Overview

EasyMadeInsights is a modern web application that democratizes data analysis by providing an intuitive platform for Excel data exploration. Upload your spreadsheets and instantly receive automated KPIs, dynamic visualizations, AI-generated business insights, and powerful file conversion tools — all without complex setup or coding knowledge.

### ✨ Key Highlights

- **📤 Drag-and-Drop Excel Upload**: Support for `.xlsx`, `.xls`, `.csv`, `.tsv`, and `.json` files
- **📊 Automated Analytics**: Instant KPI generation and data cleaning
- **📈 Interactive Charts**: Dynamic visualizations powered by Recharts
- **🤖 AI-Powered Insights**: OpenAI integration for executive summaries and business recommendations
- **🔄 File Conversions**: Built-in tools for JWT decoding, image conversion, file comparison, and more
- **🎨 Modern UI**: Clean, responsive design with light/dark theme support
- **⚡ Fast & Secure**: Client-side processing with Firebase hosting

---

## 🚀 Features

### Core Analytics
- ✅ **Multi-Format Support**: Excel (.xlsx/.xls), CSV, TSV, JSON
- ✅ **Automatic Data Cleaning**: Removes duplicates, fills missing values, detects data types
- ✅ **Smart KPI Generation**: Calculates key metrics across numeric, date, and categorical columns
- ✅ **Dynamic Charting**: Bar charts, line charts, pie charts with customizable limits
- ✅ **AI Business Analysis**: Executive summaries, key insights, risks, and action recommendations

### EasyMadeConversions Tools
- 🔧 **JWT Decoder**: Decode and inspect JSON Web Tokens
- 🖼️ **Image Converter**: Convert between PNG, JPEG, WebP formats
- 📋 **File Comparator**: Compare text files with highlighted differences
- 📄 **PDF Tools**: PDF to Word conversion (placeholder for future implementation)

### User Experience
- 🎯 **Intuitive Dashboard**: Sidebar navigation with integrated page scrolling
- 🌙 **Theme Support**: Automatic light/dark mode based on system preferences
- 📱 **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- ⚡ **Real-time Processing**: Instant results with progress indicators

---

## 🛠️ Tech Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Frontend** | React 19.2.0 + Vite | Modern SPA with fast development |
| **Routing** | React Router | Client-side navigation |
| **Styling** | Custom CSS | Themed design system |
| **Charts** | Recharts | Interactive data visualizations |
| **Data Processing** | SheetJS (xlsx) | Excel/CSV parsing |
| **Backend** | Node.js + Express | API server for AI integration |
| **AI** | OpenAI API | Business insights generation |
| **Deployment** | Firebase Hosting | Global CDN deployment |
| **Development** | ESLint, Concurrently | Code quality and dev workflow |

---

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- OpenAI API key (for AI features)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/EasyMadeInsights.git
   cd EasyMadeInsights/client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Add your OPENAI_API_KEY to .env
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Frontend: http://localhost:5173
   - API Server: http://localhost:8787

### Build for Production
```bash
npm run build
npm run preview
```

---

## 📖 Usage

### Basic Workflow

1. **Upload Data**: Drag and drop your Excel file or click to browse
2. **Select Sheet**: Choose which worksheet to analyze
3. **View Results**: Explore auto-generated KPIs and charts
4. **Get AI Insights**: Click "Generate AI Insights" for business analysis
5. **Use Tools**: Access conversion tools from the sidebar

### File Format Support

| Format | Upload | Analysis | Conversion |
|--------|--------|----------|------------|
| Excel (.xlsx/.xls) | ✅ | ✅ | ✅ |
| CSV | ✅ | ✅ | ✅ |
| TSV | ✅ | ✅ | ✅ |
| JSON | ✅ | ✅ | ✅ |

### AI Insights Example

The AI analysis provides:
- **Executive Summary**: High-level overview of your data
- **Key Findings**: Important patterns and trends
- **Risks & Opportunities**: Potential issues and growth areas
- **Action Items**: Recommended next steps

---

## 🏗️ Project Structure

```
client/
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── tools/         # Conversion tool components
│   │   └── ...            # Other components
│   ├── pages/             # Main application pages
│   ├── styles/            # CSS stylesheets
│   ├── utils/             # Utility functions
│   └── ...
├── server.mjs             # Express API server
├── package.json
└── vite.config.js
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Code Standards

- Follow ESLint configuration
- Use meaningful commit messages
- Add tests for new features
- Update documentation as needed

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [SheetJS](https://sheetjs.com/) for Excel parsing
- [Recharts](https://recharts.org/) for charting library
- [OpenAI](https://openai.com/) for AI capabilities
- [Firebase](https://firebase.google.com/) for hosting

---

## 📞 Support

- 📧 **Email**: support@easymadeinsights.com
- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/EasyMadeInsights/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/yourusername/EasyMadeInsights/discussions)

---

<div align="center">

**Made with ❤️ for data analysts, business users, and anyone who wants insights without the complexity**

[⬆️ Back to Top](#-easymadeinsights--data-insights-made-simple)

</div>

---
