# Uivsoymarks Delivers

Build a complete, real-time, multi-panel food delivery web application named "Uivsoymarks" with an Admin Dashboard, PWA installation support, and strict security protocols:



1. APP NAME & PREMIUM ZOMATO/SWIGGY UI:

- App Name: Strictly set to "Uivsoymarks".

- UI/UX Design: High-end, premium UI/UX closely resembling Zomato and Swiggy with smooth transitions, clean typography, appetizing cards, and an engaging user feel.



2. PWA (PROGRESSIVE WEB APP) SUPPORT:

- Configure the app as a PWA with manifest and service worker support so users can easily "Install App" or "Add to Home Screen" directly from their browser.



3. MASTER ADMIN ACCESS & GLOBAL CRUD:

- Master Admin Email: Restrict Admin Panel login strictly to "sagarkharal21@gmail.com". Only this specific email has full admin privileges.

- Global Management: The Admin can add, edit, or delete items, prices, and settings across Customer, Kitchen, and Delivery panels with instant real-time sync.

- Approvals & Control: Admin manually reviews and approves/rejects partner ID proofs, monitors live platform activity, and manages offers/discounts.



4. COLOR PALETTE & INTERACTIVE FEEDBACK:

- Use a food-friendly color palette (Energetic Red primary, Orange, Green for freshness, Yellow for offers).

- Ensure all interactive elements (buttons, cards, menu items) have an instant, smooth 'on-press' color change state (e.g., buttons turn a darker shade upon clicking) for immediate visual feedback.



5. AUTHENTICATION & ROLE-BASED ACCESS CONTROL:

- Customer Panel: Direct access to menus without uploading documents. Requires a real delivery address and verified details at checkout.

- Customer Login: Secure "Sign in with Google" authentication. Strictly lock first-order discount offers to unique Google accounts/devices to prevent multi-account fraud.

- Partner Verification (Mandatory): Delivery Partners and Kitchen staff MUST upload official ID proofs (e.g., Aadhar card) during signup. They cannot go online or accept orders until the master admin approves them.



6. REAL-TIME ORDER & AUTOMATED WORKFLOW:

- Instant Flow: Customer places order -> Kitchen dashboard triggers a loud continuous audio/visual alert -> Order is accepted with an entered Preparation Time (Prep Time) -> Automatically forwarded to Kitchen Display System (KDS) -> Auto-assigned to an active, verified Delivery Partner.

- Real-Time Updates: Track order stages (Placed -> Preparing -> Packed -> Out for Delivery -> Delivered) across all panels instantly using WebSockets without page refreshes.



7. PRIVACY & COMMUNICATION (Masked Calling):

- Implement an in-app proxy/masked calling system so that customers and delivery partners can communicate securely without exposing personal mobile numbers.



8. ZERO-COST MAPPING SOLUTION:

- Integrate free OpenStreetMap (OSM) / Leaflet.js for visual mapping, along with native deeplinks to open external free routing (Google Maps app) for delivery pa

rtners to avoid paid API costs.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://uivsoymarksorder.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a6c14826-6824-4319-95a4-b188244ad8f8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
