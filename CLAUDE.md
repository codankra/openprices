# OpenPrices Development Guide

## Commands

- **Development**: `npm run dev` - Start local development server
- **Build**: `npm run build` - Build the application

## Code Style Guidelines

- **TypeScript**: Use strict mode with proper type annotations
- **Components**: Follow Shadcn/UI "new-york" style for components
- **Styling**: Use Tailwind CSS for all styling
- **Imports**: Use path aliases (~/path) for internal imports
- **Error Handling**: Use proper TypeScript discriminated unions for error states
- **Naming**: Use PascalCase for components, camelCase for functions/variables
- **File Structure**: Keep related files in same directory
- **State Management**: Prefer React hooks and context over global state

When adding new features, follow existing patterns and ensure type safety.

