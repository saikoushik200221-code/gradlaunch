# Project Setup: shadcn, Tailwind, and TypeScript

This document provides instructions on how to set up the project for shadcn, Tailwind CSS, and TypeScript, as requested.

## 1. Tailwind CSS Setup
Tailwind CSS is already installed and configured in this project. 
- Configuration: `tailwind.config.js`
- Core Styles: `src/index.css`

## 2. shadcn/ui Initialization
To officially initialize shadcn/ui and get the custom configuration (like CSS variables and standard component paths):

1. Run the initialization command:
   ```bash
   npx shadcn@latest init
   ```
2. Recommended responses during initialization:
   - Style: `Default`
   - Base color: `Slate` (or your preference)
   - CSS variables: `Yes`
   - Where is your global CSS file?: `src/index.css`
   - Where is your tailwind.config.js located?: `tailwind.config.js`
   - Configure the import alias for components?: `@/components`
   - Configure the import alias for utils?: `@/lib/utils`
   - Are you using React Server Components?: `No` (since this is a Vite project)
   - Write configuration to components.json?: `Yes`

## 3. TypeScript Migration
The project is currently using JavaScript. To enable TypeScript support for `.tsx` files:

1. Install TypeScript and types:
   ```bash
   npm install -D typescript @types/react @types/react-dom @types/node
   ```
2. Initialize TypeScript configuration:
   ```bash
   npx tsc --init
   ```
3. Update `vite.config.js`:
   (Already updated with the `@` alias, but ensure it handles TS files).
4. Rename `.jsx` files to `.tsx` and `.js` files to `.ts` where appropriate.
5. The `Dock` component is already provided as a `.tsx` file in `src/components/ui/dock-two.tsx`.

## 4. Why `/components/ui`?
By default, shadcn CLI installs UI primitives (like buttons, modals, sliders) into `components/ui`. 
- **Consistency**: Keeps third-party/generated primitives separate from your application-specific business components.
- **Automation**: The shadcn CLI depends on this structure to update or add new components.
- **Portability**: Makes it easier to copy UI primitives between different projects using the same design system.

---

### Component Integrated
The `Dock` component has been integrated and is ready for use once these steps are completed (specifically the `@` alias which has already been configured in `vite.config.js`).
