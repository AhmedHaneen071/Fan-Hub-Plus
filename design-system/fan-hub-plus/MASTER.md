# Fan Hub Plus visual system

## Direction

A calm editorial home for many fandoms: warm paper, evergreen ink, quiet terracotta accents, fine borders, and generous whitespace. Use the supplied neon logo at its original proportions; do not recolor, crop, or redraw it.

## Color tokens

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| Background | `#F7F5EF` | `#202621` | Page canvas |
| Surface | `#FFFEFA` | `#29322B` | Cards and forms |
| Text | `#242B25` | `#F1F0E9` | Main copy |
| Muted | `#72776E` | `#B2B8AE` | Supporting copy |
| Evergreen | `#31483A` | `#C7D7C8` | Primary actions |
| Evergreen wash | `#E7ECE4` | `#344238` | Soft panels |
| Terracotta | `#B6674B` | `#D68B6E` | Small highlights |
| Border | `#E4E2D9` | `#404B42` | Dividers and outlines |

## Type and spacing

- Body: system sans-serif, 16 px base with a persistent 0.94–1.12 text-scale control.
- Headings: Georgia or the platform serif; medium weight and restrained tracking.
- Use a 4/8 px spacing rhythm, 44 px minimum primary controls, and comfortable 1.5 body line height.
- Keep card corners nearly square (3–5 px); use a thin border before adding a shadow.

## Components

- Primary buttons use evergreen with light text. Outlined actions use a transparent surface and the standard border.
- Cards use the surface token, one-pixel border, and a small lift on hover. Do not rely on hover to reveal actions.
- Labels remain visible above inputs. Error and success messages appear beside the relevant form.
- Cover imagery uses consistent aspect ratios and lazy loading below the fold.
- Dark mode changes the semantic tokens together; controls retain visible borders and keyboard focus.

## Responsive and accessible behavior

- Breakpoints: 760 px for compact navigation, 1000 px for dense layouts, and 400 px for narrow handsets.
- Collapse navigation and grids without horizontal page scrolling. Keep event cards and admin controls usable on touch screens.
- Preserve skip navigation, semantic headings, visible focus, readable contrast, keyboard map markers, and reduced-motion support.
- Animation is limited to short state feedback and stops when `prefers-reduced-motion` is enabled.
