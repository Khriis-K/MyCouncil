# MyCouncil

**MyCouncil** is an interactive AI-powered reflection tool designed to help users navigate complex dilemmas. By "summoning a council" of diverse AI personas, users receive multi-faceted advice tailored to their situation and personality type.

## 🌟 Features

-   **Personalized Council**: Input your personal dilemma and receive insights from a diverse group of AI "Counselors," each representing a different archetype or perspective.
-   **MBTI Integration**: Customize the council's advice by selecting your MBTI personality type, or choose a "Balanced" approach for a neutral perspective.
-   **Reflection Sphere**: A visual interface that maps out your council, allowing you to explore different viewpoints intuitively.
-   **Debate Mode**: Watch your counselors debate! The system identifies "Tension Pairs"—conflicting viewpoints between counselors—and generates a dialogue to help you understand the trade-offs of your decision.
-   **Deep Dive Overlays**: Click on individual counselors for detailed advice or on tension lines to read specific debates.

## 🛠️ Tech Stack

-   **Frontend**: [React 19](https://react.dev/)
-   **Backend**: Node.js, Express
-   **Build Tool**: [Vite](https://vitejs.dev/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **AI Integration**: [Google Gemini API](https://ai.google.dev/) (@google/genai)
-   **Styling**: Tailwind CSS & Custom CSS

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine.

### Prerequisites

-   **Node.js**: Ensure you have Node.js installed (v18+ recommended).
-   **Gemini API Key**: You will need an API key from Google's [AI Studio](https://aistudio.google.com/).

### Installation

1.  **Clone the repository** (if applicable) or navigate to the project directory.

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Setup**:
    -   Create a file named `.env.local` in the root directory.
    -   Add your Gemini API key to the file:
        ```env
        GEMINI_API_KEY=your_actual_api_key_here
        ```
    > **Note**: The backend server uses this key to authenticate with Google's Gemini API.

4.  **Run the Application**:
    You will need to run both the backend server and the frontend client.

    **Terminal 1 (Backend):**
    ```bash
    npm run server
    ```
    *Server runs at http://localhost:3000*

    **Terminal 2 (Frontend):**
    ```bash
    npm run dev
    ```
    *Client runs at http://localhost:5173*

5.  **Open the App**:
    -   Visit the URL shown in your frontend terminal (usually `http://localhost:5173`).

## 📖 Usage

1.  **Enter a Dilemma**: On the sidebar, type in the problem or decision you are facing.
2.  **Select MBTI (Optional)**: Click the MBTI icon to select your personality type for more tailored advice.
3.  **Summon the Council**: Click the "Summon Council" button.
4.  **Explore**:
    -   **Sphere View**: Interact with the visual representation of your council.
    -   **Counselors**: Click on a counselor's icon to read their specific advice.
    -   **Debates**: Toggle "Debate Mode" or click on the tension lines between counselors to see them discuss your dilemma.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
