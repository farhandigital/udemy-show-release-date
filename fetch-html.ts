function writeToFile(filename: string, data: string): void {
  const fs = require('fs');
  fs.writeFileSync(filename, data, 'utf8');
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch HTML from ${url}: ${response.statusText}`);
  }
  return await response.text();
}

const default_url = 'https://www.udemy.com/course/securityplus/';

async function main() {
  const url = process.argv[2] || default_url;
  const outputFilename = process.argv[3] || 'output.html';

  if (!url) {
    console.error('Usage: ts-node fetch-html.ts <URL> [outputFilename]');
    process.exit(1);
  }

  try {
    const html = await fetchHtml(url);
    writeToFile(outputFilename, html);
    console.log(`HTML content fetched from ${url} and saved to ${outputFilename}`);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}