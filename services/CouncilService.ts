import { CouncilResponse } from "../types";

const API_URL = 'http://localhost:3000/api/summon';

export const fetchCouncilAnalysis = async (
  dilemma: string,
  mbti: string | null
): Promise<CouncilResponse> => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dilemma, mbti }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      // Handle Zod Validation Errors
      if (errorData.details?.fieldErrors) {
        const fieldErrors = errorData.details.fieldErrors;
        const messages = Object.entries(fieldErrors)
          .map(([field, errors]) => `${field}: ${(errors as string[]).join(', ')}`)
          .join('; ');
        throw new Error(messages || errorData.error || 'Validation failed');
      }

      throw new Error(errorData.error || 'Failed to fetch council analysis');
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching council analysis:", error);
    throw error;
  }
};
