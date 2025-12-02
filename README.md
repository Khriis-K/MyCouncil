<img src="imgs/logo_transparent_dark_mode.png" alt="MyCouncil Logo" width="33%" />

# MyCouncil

**MyCouncil** is an interactive AI-powered reflection tool designed to help users navigate complex dilemmas. By "summoning a council" of diverse AI personas, users receive multi-faceted advice tailored to their situation and personality type.

## 🌟 Key Capabilities

-   **Customizable Council Summoning**: Define your dilemma and assemble a council of 3-7 AI personas. Customize their "cognitive style" by selecting your MBTI type, or choose a balanced panel.
-   **Reflection Lenses**: Direct the council's analytical focus. Choose from **Decision-Making** (practical trade-offs), **Emotional Processing** (internal values), or **Creative Problem Solving** (novel approaches).
-   **Interactive Council Clash**: Watch counselors debate your dilemma in real-time. Identify "Tension Pairs" where perspectives conflict, and **inject your own thoughts** into the debate to see how they react and adjust their stances.
-   **1-on-1 Counselor Chat**: Go beyond the initial advice. Open a direct chat line with any counselor to ask follow-up questions or dig deeper into their specific perspective.
-   **Iterative Refinement**: As you reflect, new context often emerges. Add new details to your dilemma, and watch the council re-evaluate their positions and update their advice in real-time.
-   **Visual Insight Mapping**: Explore a dynamic 3D "Reflection Sphere" where counselors orbit your central dilemma. Visual tension lines highlight conflicting viewpoints, helping you understand the landscape of your decision.

## 🛠️ Tech Stack

-   **Frontend**: [React 19](https://react.dev/)
-   **Backend**: Node.js, Express
-   **Build Tool**: [Vite](https://vitejs.dev/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **AI Integration**: [Google Gemini API](https://ai.google.dev/) (@google/genai) with advanced prompt engineering for natural, conversational dialogue and consistent pronoun usage.
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
    Start both the backend server and frontend client with a single command:

    ```bash
    npm start
    ```
    *   **Frontend**: http://localhost:3001 (Proxies API requests to backend)
    *   **Backend**: http://localhost:3000

    > **Note**: You can still run them individually using `npm run server` and `npm run dev` if preferred.

5.  **Open the App**:
    -   Visit http://localhost:3001 in your browser.

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