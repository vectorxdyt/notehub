# Notehub
<!-- impeccable:product-schema 1 -->
## Platform
web
## Users
A math teacher shares photographs of her board; students review previous material.
## Product Purpose
A minimal, searchable archive of calculus lesson images.
## Brand Commitments
Name: notehub. Minimalistic interface. Vercel deployment target.
## Capabilities and Constraints
Teacher uploads images into numbered Math Medic AP Calculus lesson destinations; students browse previous lessons. Calculus is the only course. No real class material was supplied. Example lessons must be labeled as examples.
## Stack
Next.js for Vercel. Firebase Authentication with Google SSO for teacher sign-in, Firestore for lessons, and Cloudinary Free for photos. No credit card or Firebase billing upgrade. Only verified Google accounts in the server-configured teacher email allowlist can publish or delete. Students browse without accounts. Owner configuration is required before shared use.
