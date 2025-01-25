import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import stylistic from '@stylistic/eslint-plugin';

export default [{
   files: ['**/*.ts'],
}, {
   plugins: {
      '@typescript-eslint': typescriptEslint,
      '@stylistic': stylistic,
   },

   languageOptions: {
      parser: tsParser,
      ecmaVersion: 2024,
      sourceType: 'module',
   },

   rules: {
      '@typescript-eslint/naming-convention': ['warn', {
         selector: 'import',
         format: ['camelCase', 'PascalCase'],
      }],

      curly: 'warn',
      eqeqeq: 'warn',
      'no-throw-literal': 'warn',
      semi: 'warn',

      '@stylistic/indent': ['error', 3],
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/no-tabs': 'error',
      '@stylistic/no-trailing-spaces': 'error',
   },
}];