# ReactBits Documentation

## About
ReactBits is a library of animated and interactive React components designed to streamline UI development and simplify your workflow. It provides everything needed to create unique and impactful websites, from simple text animations to complex 3D components.

## Key Features
- A variety of animated text and UI components
- Customizable and lightweight with minimal dependencies
- Designed to integrate seamlessly with any React project

## Installation

### Prerequisites
- Node.js and npm installed
- A React project

### Setup Options

#### 1. One-Time Component Installation
```bash
npx jsrepo add https://reactbits.dev/default/<categoryName>/<ComponentName>

# Example:
npx jsrepo add https://reactbits.dev/default/TextAnimations/SplitText
```

#### 2. One-Time Installation (Tailwind)
```bash
npx jsrepo add https://reactbits.dev/tailwind/<categoryName>/<ComponentName>

# Example:
npx jsrepo add https://reactbits.dev/tailwind/TailwindTextAnimations/SplitText
```

#### 3. Full CLI Setup
```bash
# 1. Initialize a config file for your project
npx jsrepo init https://reactbits.dev/default/ # default
# OR
npx jsrepo init https://reactbits.dev/tailwind/ # tailwind

# 2. Browse & add components from the list
npx jsrepo add

# 3. Or just add a specific component
npx jsrepo add <CategoryName>/<ComponentName>
```

## Usage Example

```jsx
import { SplitText } from '@reactbits/animations';

function MyComponent() {
  return (
    <div>
      <SplitText>
        This text will be animated!
      </SplitText>
    </div>
  );
}
```

## Component Categories

1. **Text Animations**
   - Split Text
   - Fade In/Out
   - Typing Effects
   - Scroll-triggered animations

2. **UI Components**
   - Buttons
   - Cards
   - Navigation
   - Modals

3. **3D Components**
   - 3D Text
   - 3D Objects
   - Interactive 3D elements

4. **Interactive Elements**
   - Hover Effects
   - Click Animations
   - Scroll-based Interactions

## Best Practices

1. **Performance**
   - Import only the components you need
   - Use lazy loading for heavy components
   - Consider using the Tailwind version for better optimization

2. **Customization**
   - Components accept standard React props for customization
   - Use provided theme options when available
   - Extend components using standard React patterns

3. **Accessibility**
   - All components maintain ARIA compliance
   - Animations respect user preferences (reduce-motion)
   - Keyboard navigation support included

## Official Resources
- [Official Documentation](https://reactbits.dev)
- Component Browser: Use `npx jsrepo add` to explore available components 