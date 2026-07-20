# Beyond The Visa UI Boot Cleanup v89.1

This revision fixes the remaining flash of legacy login pages and themes.

## Root cause
The boot guard hid the page initially, but a second script removed the guard at `DOMContentLoaded`. That event fires before the later versioned stylesheets and scripts have finished loading and applying the current interface. The page was therefore revealed while older login and theme layers were still active.

## Change
- The interface is now revealed only after the full `window.load` event and two animation frames.
- The emergency fallback was extended to eight seconds so it does not normally reveal the page during script initialization.
- The fallback still prevents a permanently blank page if a resource fails.
- Existing application features and versioned files were not removed in this patch.

## Installation
Replace `web/index.html`, run `npm run build:web`, and deploy the newly generated `www` output.
