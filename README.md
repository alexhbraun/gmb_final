# GMB Audit Generator

## Setup

1.  **Install Dependencies**
    ```bash
    cd functions && npm install
    cd ../apps/web && npm install
    ```

2.  **Environment Variables**
    Create `functions/.env` with:
    ```
    GOOGLE_PLACES_KEY=your_key_here
    GEMINI_API_KEY=your_key_here
    ```

3.  **Run Locally**
    ```bash
    # Start Emulators (Functions + Firestore)
    firebase emulators:start

    # Start Frontend (in another terminal)
    cd apps/web
    npm run dev
    ```

    The frontend will be at `http://localhost:3000`.
    The functions will be at `http://127.0.0.1:5001/PROJECT_ID/us-central1/generate`.

## Deployment

1.  **Deploy Functions**
    ```bash
    firebase deploy --only functions
    ```

2.  **Deploy Frontend**
    ```bash
    cd apps/web
    npm run build
    firebase deploy --only hosting
    ```
