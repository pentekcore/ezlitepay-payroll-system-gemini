# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Prerequisites

- Node.js
- A Supabase project (create one at [supabase.com](https://supabase.com))

## Run Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Supabase:**
   - Go to your [Supabase dashboard](https://supabase.com/dashboard)
   - Navigate to Settings > API
   - Copy your Project URL and anon/public key
   - Update the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in [.env.local](.env.local)

3. **Run the app:**
   ```bash
   npm run dev
   ```

## Important Notes

- Make sure to replace all placeholder values in `.env.local` with your actual credentials
- Restart the development server after updating environment variables
- The app will show connection errors until Supabase is properly configured