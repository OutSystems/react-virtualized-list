# react-virtualized-list
Virtualization technique applied to a react list component

Lists tend to grow and have hundreds of DOM elements which can become a problem specially on mobile devices. Using a virtualization technique (or windowing) we can discard the elements that are not visible on the viewport thus improving the performance when scrolling a list with thousands of elements.

### List features:
- Items virtualization (only visible items are rendered)
- Supports variable items' size (automatic size detection, no need to specify)
- Supports items' animation
- Smooth scrolling
- Introduces extra elements but with minimal impact in css
- Automatic feature detection: disables automatically when virtualization is not possible

### Animation features (CSSTransitionGroup like component included):
- Supports transitions duration based on CSS (no need to set transition duration in code)
- Supports transition from/to auto width/height

