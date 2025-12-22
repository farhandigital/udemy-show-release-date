import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
    srcDir: 'src',
    modules: ['@wxt-dev/auto-icons'],
    manifest: {
    browser_specific_settings: {
      gecko: {
        id: "udemy-show-release-date@InvictusNavarchus",
        strict_min_version: "109.0" // MV3 support started in Firefox 109
      }
    }
  }
});
