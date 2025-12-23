import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
    srcDir: 'src',
    modules: ['@wxt-dev/auto-icons'],
    manifest: {
    browser_specific_settings: {
      gecko: {
        id: "udemy-show-release-date@InvictusNavarchus",
        // @ts-expect-error - data_collection_permissions is a valid Firefox manifest setting, but currently unsupported by WXT types
        data_collection_permissions: {
          "required": ["none"]
        },
        strict_min_version: "142.0", // data_collection_permissions is introduced and required as of v140, Nov 2025 (v142 for Android)
      }
    }
  }
});
