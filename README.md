# Sugar-UI

A JavaScript UI component library with docking layout support.

## Features

- **30+ UI Components** - Button, Input, ColorPicker, TreeView, Grid, and more
- **Docker Layout System** - GoldenLayout-based docking windows
- **Data Binding** - Two-way binding with observers
- **ES Modules** - Modern JavaScript with tree-shaking support
- **Themed** - Built-in grey theme

## Installation

```bash
npm install sugar-ui
```

## Usage

### Import Everything

```javascript
import { Button, Input, ColorPicker, GoldenLayout } from 'sugar-ui';
```

### UI Components

```javascript
import { Button, TextInput, SelectInput } from 'sugar-ui';

// Create components
const button = new Button({
  text: 'Click Me',
  icon: 'E400'
});

const input = new TextInput({
  placeholder: 'Enter text...',
  value: 'Hello'
});

const select = new SelectInput({
  options: [
    { text: 'Option 1', value: 1 },
    { text: 'Option 2', value: 2 }
  ]
});

// Add to DOM
document.body.appendChild(button.dom);
```

### Docker Layout

```javascript
import { GoldenLayout } from 'sugar-ui';

const config = {
  root: {
    type: 'column',
    content: [
      {
        type: 'row',
        content: [
          {
            type: 'stack',
            content: [
              {
                type: 'component',
                componentName: 'myComponent',
                title: 'Panel 1'
              }
            ]
          }
        ]
      }
    ]
  }
};

const layout = new GoldenLayout(config);

layout.registerComponent('myComponent', function(container, state) {
  container.element.innerHTML = '<h1>Hello World</h1>';
});

layout.init();
```

## Available Components

### Basic Elements
| Component | Description |
|-----------|-------------|
| `Button` | Interactive button with icon support |
| `Label` | Text label component |
| `Divier` | Horizontal/vertical divider |
| `InfoBox` | Information display box |

### Input Components
| Component | Description |
|-----------|-------------|
| `TextInput` | Single-line text input |
| `TextAreaInput` | Multi-line text input |
| `NumericInput` | Number input with stepper |
| `SliderInput` | Range slider |
| `SelectInput` | Dropdown select |
| `BooleanInput` | Checkbox/toggle |
| `ColorPicker` | Color selection |
| `GradientPicker` | Gradient selection |
| `ArrayInput` | Array/list input |

### Layout Components
| Component | Description |
|-----------|-------------|
| `Container` | Flex container |
| `Panel` | Collapsible panel |
| `Overlay` | Modal overlay |
| `Menu` | Dropdown menu |
| `TreeView` | Tree structure view |
| `GridView` | Grid layout view |

### Docker Layout
| Component | Description |
|-----------|-------------|
| `GoldenLayout` | Main docking layout manager |
| `Stack` | Stackable panels |
| `RowOrColumn` | Row/column layout |
| `ComponentItem` | Draggable component |

## CSS

Include the theme CSS in your project:

```html
<!-- Grey theme (default) -->
<link rel="stylesheet" href="sugar-ui/pcui-theme-grey.css">

<!-- Docker layout theme -->
<link rel="stylesheet" href="sugar-ui/theme.css">
```

Or copy these files from `Sandbox/css/` to your project:
- `pcui-theme-grey.css` - UI component styles
- `theme.css` - Docker layout styles

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev:ui       # UI Examples
npm run dev:docker   # Docker Examples

# Build
npm run build
```

## Project Structure

```
sugar-ui/
├── Sugar/           # UI Components
│   ├── Nodes/       # 30+ UI components
│   ├── Binding/     # Data binding system
│   ├── Events/      # Event handling
│   └── Observer/    # State management
├── Docker/          # Docking Layout
│   ├── Core/        # Layout manager
│   ├── Nodes/       # Layout components
│   └── Events/      # Layout events
├── Sandbox/         # Examples
│   ├── UI Examples/ # Component demos
│   └── Docker Examples/ # Layout demos
└── dist/            # Built files
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Author

Hamim Ally

---

Built with JavaScript ❤️
