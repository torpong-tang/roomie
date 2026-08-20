/**
 * Animated silk backdrop behind the whole app.
 *
 * Pure CSS and one inlined SVG noise tile: no WebGL, no canvas, and no JavaScript
 * ships for it. The layers only animate `transform`, so the browser composites them
 * on the GPU instead of repainting, and they hold still under `prefers-reduced-motion`.
 * Styles live in globals.css next to the rest of the app's visual language.
 */
export function AppBackground() {
    return (
        <div aria-hidden className="app-backdrop">
            <div className="app-backdrop-folds" />
            <div className="app-backdrop-sheen" />
            <div className="app-backdrop-grain" />
            <div className="app-backdrop-veil" />
        </div>
    );
}
