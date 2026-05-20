<div align="center">

# 📄 PDF Tools

### The Ultimate Private, Fast, and Open-Source PDF Utility Suite

A beautifully designed, premium web application packed with over 25+ essential tools to manage, convert, edit, and secure your PDF files. Built with **Next.js 16 (App Router)**, **React 19**, and **Tailwind CSS v4**.

[View Features](#-key-features) • [Tech Stack](#%EF%B8%8F-technology-stack) • [Installation](#-getting-started) • [Privacy Design](#-privacy-first-architecture)

---

[![Next.js Version](https://img.shields.io/badge/Next.js-16.2.6-black?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React Version](https://img.shields.io/badge/React-19.2.4-blue?logo=react&logoColor=white)](https://react.dev/)
[![Tailwind CSS Version](https://img.shields.io/badge/Tailwind_CSS-v4.0.0-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![TypeScript Version](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.2.0-47a248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 🔒 Privacy-First Architecture

Unlike traditional online PDF processors that upload your documents to remote servers, **PDF Tools is designed with user privacy as the core tenant**:

*   **Client-Side Execution**: Over **80% of operations**—including merging, splitting, compressing, rotating, watermarking, encrypting, and decrypting—happen **entirely in your web browser**. Your files never leave your computer.
*   **Secure API Processing**: Complex file conversions (e.g., Office documents to/from PDF) and web scrapers are processed securely using lightweight Next.js API routes, with automatic temporary memory cleanup post-processing.
*   **No File Retention**: We do not store, view, or log any contents of the documents you process.

---

## 🚀 Key Features

Our utility suite is packed with tools categorized to cover every document workflow:

### 🔄 Convert to PDF
*   **Word to PDF**: Convert `.doc` and `.docx` files to print-ready PDF formats.
*   **Excel to PDF**: Make spreadsheet tables and matrices readable and shareable.
*   **PowerPoint to PDF**: Convert presentation slides into easily distributable PDFs.
*   **JPG to PDF**: Turn images to PDF, with adjustable margins and orientations.
*   **HTML to PDF**: Convert active webpages or HTML code directly to PDF files.

### 🔄 Convert from PDF
*   **PDF to Word**: Convert PDFs back to editable `.docx` files.
*   **PDF to Excel**: Parse layout tables into clean Excel `.xlsx` spreadsheets in seconds.
*   **PDF to PowerPoint**: Generate `.pptx` slides directly from your PDF pages.
*   **PDF to JPG**: Extract all embedded images or render every page as a high-quality JPG image.

### 🛠️ Edit & Optimize
*   **Compress PDF**: Reduce file size while optimizing for maximum image/text quality.
*   **Merge PDF**: Combine multiple PDFs together in any sequence with drag-and-drop ease.
*   **Split PDF**: Extract specific pages or separate a document into standalone files.
*   **Organize PDF**: Rearrange, insert, drag, delete, or sort PDF pages on a visual grid canvas.
*   **Rotate PDF**: Rotate single pages or entire documents instantly.
*   **Crop PDF**: Adjust margins and change paper dimensions visually.
*   **Edit PDF**: Direct markup annotation tool to add custom text, shapes, or highlights.

### 🔒 Security & Signatures
*   **Protect PDF**: Secure sensitive files with strong password encryption (user & owner passwords).
*   **Unlock PDF**: Strip security locks and restrictions from standard PDFs.
*   **Sign PDF**: Sign documents electronically or request cryptographic signatures.
*   **Redact PDF**: Permanently black out/erase confidential content and metadata.
*   **Compare PDF**: View two PDFs side-by-side to highlight and inspect text/visual differences.

### ⚙️ Advanced Utilities
*   **PDF to PDF/A**: Archive documents using the ISO-standard long-term preservation format.
*   **Repair PDF**: Scan, rebuild, and salvage usable data structures from corrupted or broken PDFs.
*   **Page Numbers**: Dynamically number headers or footers with customizable offsets, formats, and fonts.
*   **PDF Forms**: Design interactive form inputs or fill out digital forms.
*   **Translate PDF**: Translate text inside documents into dozens of foreign languages.

---

## 🛠️ Technology Stack

*   **Framework**: [Next.js 16](https://nextjs.org/) (App Router & Serverless Routes)
*   **Runtime**: [React 19](https://react.dev/)
*   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with custom animations and glassmorphism.
*   **Animations**: [Framer Motion](https://www.framer.com/motion/) for premium, fluid UI micro-interactions.
*   **Database**: [MongoDB](https://www.mongodb.com/) (For optional user authentication and usage tracking metrics)
*   **Client-Side PDF Engines**:
    *   [pdf-lib](https://pdf-lib.js.org/) — Main creation, modification, encryption, and layout manipulation.
    *   [pdfjs-dist](https://mozilla.github.io/pdf.js/) — Page rendering, rasterization, and text extraction.
*   **Document Parsers**:
    *   `docx` & `pptxgenjs` — Office document generation.
    *   `exceljs` — Reading and writing Excel workbooks.
    *   `mammoth` — Precise Word Document converter.
    *   `jszip` — In-browser archiving and compression.
    *   `tesseract.js` — Client-side optical character recognition (OCR).

---

## 📁 Project Structure

```bash
pdf-tools/
├── src/
│   ├── app/                # Next.js App Router Pages and API Routes
│   │   ├── api/            # API endpoints (e.g. auth, conversions, usage stats)
│   │   ├── compare-pdf/    # Page components for each specific PDF tool...
│   │   ├── compress-pdf/
│   │   ├── merge-pdf/
│   │   ├── ...             # Custom folder per utility tool
│   │   ├── globals.css     # Global CSS rules (Tailwind config/variables)
│   │   ├── layout.tsx      # Global shell component (Navbar, Footer, Providers)
│   │   └── page.tsx        # Homepage layout showing the tool selection grid
│   ├── components/         # Reusable React UI Components
│   │   ├── ui/             # Atomic design system elements (e.g., buttons)
│   │   ├── Header.tsx      # Premium navigation bar
│   │   ├── file-uploader.tsx  # Drag-and-drop workspace file component
│   │   └── result-screen.tsx  # Download, export, and sharing UI screen
│   └── lib/                # Shared utilities
│       └── mongodb.ts      # Mongo DB Client initialization
├── public/                 # Static assets (icons, images)
├── package.json            # Node.js dependencies and run scripts
├── tsconfig.json           # TypeScript configuration
└── next.config.ts          # Next.js specific configuration
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) (v18.x or later) and [npm](https://www.npmjs.com/) installed on your machine. You will also need a running [MongoDB](https://www.mongodb.com/) instance (local or Atlas) if you plan on enabling database integrations.

### Installation

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-username/pdf-tools.git
    cd pdf-tools
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**:
    Create a `.env` file in the root directory and define your MongoDB URI:
    ```env
    MONGODB_URI=mongodb://127.0.0.1:27017/pdf-tools
    ```

4.  **Run the Development Server**:
    ```bash
    npm run dev
    ```

    Open your browser and navigate to [http://localhost:3000](http://localhost:3000) to see the application in action.

### Production Build

To build the application for production:

```bash
npm run build
npm run start
```

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
