# KerfSuite Portal

The **KerfSuite Portal** is a comprehensive, secure web application for managing KerfSuite hardware licenses, workspaces, user access, and material inventory.

## Features

* **License Management:** Generate, track, and instantly revoke application licenses for KerfCut and KerfStock. Includes robust offline lease validation and hardware binding.
* **Role-Based Access Control:** Secure user management with explicit Admin and Member roles, backed by Multi-Factor Authentication (MFA) requirements for sensitive operations.
* **Inventory & Stock Management:** Track available materials, manage physical asset locations, and record stock consumption directly linked to KerfCut operations.
* **Security & Auditing:** Comprehensive audit logging for all critical system actions. Global API rate limiting to prevent abuse.
* **Modern Architecture:** Built on the Next.js App Router for optimal server-side performance and SEO, styled with modular CSS.

## Tech Stack

* **Framework:** [Next.js](https://nextjs.org/) (App Router)
* **Backend & Auth:** [Supabase](https://supabase.com/) (PostgreSQL, Authentication, Row Level Security)
* **Rate Limiting:** [Upstash Redis](https://upstash.com/)
* **Error Tracking:** [Sentry](https://sentry.io/)

## Getting Started

### Prerequisites

* Node.js 18.17 or later
* npm or yarn
* A Supabase Project
* An Upstash Redis database
* A Sentry Project (Optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Kerf_Suite
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   Fill in all the required variables in `.env.local`, including your Supabase API keys and Upstash Redis credentials.

4. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## License

This project is proprietary and closed-source. All rights reserved by **Synontech**. See the `LICENSE.txt` file for more details.
