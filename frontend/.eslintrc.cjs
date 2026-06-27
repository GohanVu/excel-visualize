module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    // 200 = soft limit (warn in IDE), 400 enforced by pre-commit hook
    'max-lines': ['warn', { max: 200, skipBlankLines: true, skipComments: true }],
    'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
  },
  overrides: [
    {
      // Test cần cast `any` để introspect cấu trúc option/response
      files: ['**/*.test.ts', '**/*.test.tsx'],
      rules: { '@typescript-eslint/no-explicit-any': 'off' },
    },
  ],
};
