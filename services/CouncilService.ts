import { CouncilResponse } from "../types";

const API_URL = 'http://localhost:3000/api/summon';

export const fetchCouncilAnalysis = async (
  dilemma: string,
  mbti: string | null,
  councilSize: number = 4,
  previousSummary?: string,  // Optional: AI-generated summary of previous refinements
  additionalContext?: string  // Optional: New context for refinement
): Promise<CouncilResponse> => {
  try {
    const requestBody = { 
      dilemma, 
      mbti, 
      councilSize,
      ...(previousSummary && { previousSummary }),
      ...(additionalContext && { additionalContext })
    };
    console.log('🚀 Sending request to backend:', requestBody);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📡 Response status:', response.status, response.statusText);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

    // Read the raw response text first
    const rawText = await response.text();
    console.log('📄 Raw response text (first 500 chars):', rawText.substring(0, 500));

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(rawText);
      } catch (e) {
        console.error('❌ Failed to parse error response as JSON:', rawText);
        throw new Error(`Server error (${response.status}): ${rawText}`);
      }
      
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

    // Parse successful response
    let data;
    try {
      data = JSON.parse(rawText);
      console.log('✅ Successfully parsed response:', Object.keys(data));
      return data;
    } catch (e) {
      console.error('❌ Failed to parse success response as JSON:', rawText);
      throw new Error('Invalid JSON response from server');
    }
  } catch (error) {
    console.error('💥 Error fetching council analysis:', error);
    throw error;
  }
};
