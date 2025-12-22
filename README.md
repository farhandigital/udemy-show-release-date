# Udemy Show Release Date

A browser extension that displays the release date of Udemy courses directly on the course page.

Currently, Udemy primarily shows `Last Updated` metadata on the course page. This can be misleading because Udemy doesn't show what has been updated exactly. The author can simply make a minimal edit such as fixing a typo in one of the lectures, or replacing the intro video with the current year mention.

With this extension, an extra metadata, release date, will be added to the course page right beside the `Last Updated` metadata.

## 🎯 Features

- **Instant Course Dates**: View the release/creation date of any Udemy course with a single glance
- **Non-Intrusive Design**: The date is seamlessly integrated into the existing course metadata
- **Cross-Browser Support**: Works on Chrome/Edge and Firefox
- **Lightweight**: Minimal performance impact with efficient API calls
- **Production Ready**: Fully tested with comprehensive unit test coverage

## 📋 How It Works

1. When you visit a Udemy course page, the extension automatically detects the course
2. It fetches the course metadata from Udemy's public API
3. The creation/release date is extracted and formatted (Month/Year format)
4. The date is injected into the course metadata section for easy visibility

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) - JavaScript runtime and package manager
- Node.js 22+ (if not using Bun)
- A modern browser (Chrome, Edge, or Firefox)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd udemy-show-release-date
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Start development server**
   ```bash
   bun run dev
   ```
   
   For Firefox:
   ```bash
   bun run dev:firefox
   ```

## 🔧 Development

### Project Structure

```
src/
├── entrypoints/
│   ├── course-date.content.ts    # Main content script
│   └── __tests__/                # Component tests
├── utils/
│   ├── dom.ts                    # DOM manipulation utilities
│   ├── udemy-api.ts              # Udemy API integration
│   └── __tests__/                # Utility tests
└── assets/                       # Extension assets
```

### Available Commands

| Command | Purpose |
|---------|---------|
| `bun run dev` | Start development with live reloading (Chrome/Edge) |
| `bun run dev:firefox` | Start development for Firefox |
| `bun run build` | Build extension for production (Chrome/Edge) |
| `bun run build:firefox` | Build extension for Firefox |
| `bun run zip` | Create distributable ZIP (Chrome/Edge) |
| `bun run zip:firefox` | Create distributable ZIP (Firefox) |
| `bun run test` | Run all tests once |
| `bun run test:ui` | Run tests with interactive UI |
| `bun run test:coverage` | Generate code coverage report |
| `bun run compile` | Type-check TypeScript (no emit) |

### Testing

The project uses **Vitest** for testing and **jsdom** for DOM simulation.

```bash
# Run tests
bun run test

# Watch mode
bun run test

# Interactive UI
bun run test:ui

# Generate coverage report
bun run test:coverage
```

### Type Checking

Always check for type errors when making changes:

```bash
bun run compile
```

## 🏗️ Tech Stack

- **Language**: TypeScript 5.9+
- **Framework**: [WXT](https://wxt.dev/) 0.20.6+
- **Testing**: Vitest 4.0.16+ with jsdom
- **Runtime & Package Manager**: Bun 1.3.1+

## 📦 Architecture

### Content Script (`course-date.content.ts`)
- Runs on all Udemy course pages (`*://www.udemy.com/course/*`)
- Extracts course ID from DOM
- Fetches course data via Udemy API
- Injects formatted date into course metadata

### Utilities
- **`udemy-api.ts`**: Handles API communication with Udemy's REST API
- **`dom.ts`**: Provides DOM manipulation helpers for creating and inserting UI elements

## 🔌 API Integration

The extension uses Udemy's public API endpoint:

```
GET https://www.udemy.com/api-2.0/courses/{courseId}/?fields[course]=created
```

This endpoint returns course metadata including the creation date in ISO 8601 format.

## 🧪 Testing

The project includes comprehensive tests:

- **Content Script Tests**: Validates the main extension logic
- **API Tests**: Ensures correct API interactions
- **DOM Tests**: Verifies correct element creation and manipulation
- **Coverage**: Aims for high test coverage to catch regressions

## 📄 License

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Make your changes and write tests
3. Run tests and type checking: `bun run test && bun run compile`
4. Commit with conventional commit messages
5. Push and create a Pull Request

## 📚 Resources

- [WXT Documentation](https://wxt.dev/)
- [Vitest Documentation](https://vitest.dev/)

